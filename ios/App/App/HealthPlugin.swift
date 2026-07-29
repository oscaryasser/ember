import Foundation
import Capacitor
import HealthKit

// Read-only HealthKit bridge for Ember. Exposes three methods to the web layer
// under the JS name "Health":
//   isAvailable()          -> { available: Bool }
//   requestAuthorization() -> { granted: Bool }
//   query({ startISO, endISO }) -> { byDay: { "YYYY-MM-DD": {...} } }
//
// We never write to HealthKit (toShare is empty). Data is aggregated per LOCAL
// calendar day so the keys line up with the app's todayKey (en-CA / ISO date).
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "query", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private let dayFmt: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private func readTypes() -> Set<HKObjectType> {
        var s = Set<HKObjectType>()
        if let t = HKObjectType.quantityType(forIdentifier: .bodyMass) { s.insert(t) }
        if let t = HKObjectType.quantityType(forIdentifier: .stepCount) { s.insert(t) }
        if let t = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { s.insert(t) }
        if let t = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { s.insert(t) }
        s.insert(HKObjectType.workoutType())
        return s
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: [], read: readTypes()) { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["granted": granted])
        }
    }

    @objc func query(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["byDay": [:]])
            return
        }
        let end = isoDate(call.getString("endISO")) ?? Date()
        let start = isoDate(call.getString("startISO")) ?? Calendar.current.date(byAdding: .day, value: -30, to: end)!

        // Accumulate into a per-day dictionary guarded by a serial queue.
        var byDay: [String: [String: Any]] = [:]
        let sync = DispatchQueue(label: "ember.health.accumulate")
        let group = DispatchGroup()
        func put(_ day: String, _ key: String, _ value: Any) {
            sync.sync {
                var d = byDay[day] ?? [:]
                d[key] = value
                byDay[day] = d
            }
        }

        // --- cumulative sums by day: steps, active energy ---
        sumByDay(.stepCount, unit: .count(), start: start, end: end, group: group) { day, v in
            put(day, "steps", v)
        }
        sumByDay(.activeEnergyBurned, unit: .kilocalorie(), start: start, end: end, group: group) { day, v in
            put(day, "activeEnergy", v)
        }
        // --- most-recent body mass per day (lbs) ---
        mostRecentByDay(.bodyMass, unit: .pound(), start: start, end: end, group: group) { day, v in
            put(day, "bodyMass", v)
        }
        // --- sleep hours per day (bucketed by the day the sleep ended) ---
        sleepByDay(start: start, end: end, group: group) { day, hours in
            put(day, "sleepHours", hours)
        }
        // --- workouts: list of { kind } per day ---
        workoutsByDay(start: start, end: end, group: group) { day, kind in
            sync.sync {
                var d = byDay[day] ?? [:]
                var list = (d["workouts"] as? [[String: Any]]) ?? []
                list.append(["kind": kind])
                d["workouts"] = list
                byDay[day] = d
            }
        }

        group.notify(queue: .main) {
            call.resolve(["byDay": byDay])
        }
    }

    // MARK: - helpers

    private func isoDate(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }

    private func sumByDay(_ id: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, end: Date,
                          group: DispatchGroup, _ emit: @escaping (String, Double) -> Void) {
        guard let qType = HKObjectType.quantityType(forIdentifier: id) else { return }
        group.enter()
        let anchor = Calendar.current.startOfDay(for: start)
        let interval = DateComponents(day: 1)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let q = HKStatisticsCollectionQuery(quantityType: qType, quantitySamplePredicate: predicate,
                                            options: .cumulativeSum, anchorDate: anchor, intervalComponents: interval)
        q.initialResultsHandler = { [weak self] _, results, _ in
            defer { group.leave() }
            guard let self = self, let results = results else { return }
            results.enumerateStatistics(from: start, to: end) { stat, _ in
                if let sum = stat.sumQuantity() {
                    let day = self.dayFmt.string(from: stat.startDate)
                    emit(day, sum.doubleValue(for: unit))
                }
            }
        }
        store.execute(q)
    }

    private func mostRecentByDay(_ id: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, end: Date,
                                 group: DispatchGroup, _ emit: @escaping (String, Double) -> Void) {
        guard let qType = HKObjectType.quantityType(forIdentifier: id) else { return }
        group.enter()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)]
        let q = HKSampleQuery(sampleType: qType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: sort) { [weak self] _, samples, _ in
            defer { group.leave() }
            guard let self = self, let samples = samples as? [HKQuantitySample] else { return }
            // Later samples overwrite earlier ones for the same day → most recent wins.
            for s in samples {
                let day = self.dayFmt.string(from: s.endDate)
                emit(day, s.quantity.doubleValue(for: unit))
            }
        }
        store.execute(q)
    }

    private func sleepByDay(start: Date, end: Date, group: DispatchGroup, _ emit: @escaping (String, Double) -> Void) {
        guard let cType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        group.enter()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let q = HKSampleQuery(sampleType: cType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
            defer { group.leave() }
            guard let self = self, let samples = samples as? [HKCategorySample] else { return }
            var totals: [String: Double] = [:]
            for s in samples where self.isAsleep(s.value) {
                let day = self.dayFmt.string(from: s.endDate)  // credit to the morning it ended
                let hrs = s.endDate.timeIntervalSince(s.startDate) / 3600.0
                totals[day, default: 0] += hrs
            }
            for (day, hrs) in totals { emit(day, hrs) }
        }
        store.execute(q)
    }

    private func isAsleep(_ value: Int) -> Bool {
        if #available(iOS 16.0, *) {
            switch value {
            case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                 HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                 HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                 HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                return true
            default:
                return false
            }
        } else {
            return value == HKCategoryValueSleepAnalysis.asleep.rawValue
        }
    }

    private func workoutsByDay(start: Date, end: Date, group: DispatchGroup, _ emit: @escaping (String, String) -> Void) {
        group.enter()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let q = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
            defer { group.leave() }
            guard let self = self, let workouts = samples as? [HKWorkout] else { return }
            for w in workouts {
                guard let kind = self.kind(for: w.workoutActivityType) else { continue }
                let day = self.dayFmt.string(from: w.startDate)
                emit(day, kind)
            }
        }
        store.execute(q)
    }

    private func kind(for type: HKWorkoutActivityType) -> String? {
        switch type {
        case .running, .trackAndField:
            return "run"
        case .traditionalStrengthTraining, .functionalStrengthTraining, .coreTraining, .crossTraining, .highIntensityIntervalTraining:
            return "strength"
        default:
            return nil
        }
    }
}
