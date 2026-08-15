import UIKit
import Capacitor

// Capacitor's SPM integration only auto-registers plugins that ship as npm
// packages (scanned from CapApp-SPM). A plugin written directly in the App
// target — like our HealthPlugin — is compiled but never handed to the bridge,
// so JS calls fail with "Health plugin is not implemented on ios". Registering
// it explicitly in capacitorDidLoad() is the supported way to expose it.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
