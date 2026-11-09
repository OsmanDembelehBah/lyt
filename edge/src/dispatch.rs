
use crate::types::{DispatchAction, LocalDispatch, Reading, SiteConfig};

pub struct LocalDispatcher {
    config: SiteConfig,
}

impl LocalDispatcher {
    pub fn new(config: SiteConfig) -> Self {
        Self { config }
    }

    /// Evaluates current site reading and determines safety dispatch action.
    /// Hard constraint: Guarantees 3 hours of critical healthcare reserve.
    pub fn evaluate(&self, r: &Reading, storm_alert: bool) -> LocalDispatch {
        let critical_reserve_kwh = self.config.critical_kw * 3.0;
        let current_stored_kwh = self.config.batt_kwh * r.soc;
        let reserve_satisfied = current_stored_kwh >= critical_reserve_kwh;
        let critical_soc_threshold = critical_reserve_kwh / self.config.batt_kwh;

        let (action, reason) = if storm_alert {
            (
                DispatchAction::PrechargeStorm,
                "Storm alert active. Precharging battery to 100% and elevating critical reserve buffer.".to_string(),
            )
        } else if !reserve_satisfied || r.soc <= critical_soc_threshold + 0.04 {
            (
                DispatchAction::ShedNonCritical,
                format!(
                    "Battery stored ({:.1} kWh) approaching critical healthcare threshold ({:.1} kWh). Shedding commercial loads.",
                    current_stored_kwh, critical_reserve_kwh
                ),
            )
        } else if r.pv_kw > r.load_kw + 1.5 && r.soc > 0.60 {
            (
                DispatchAction::SurplusAgroProcessing,
                format!(
                    "Solar surplus ({:.1} kW net) with battery at {:.0}%. Safe to dispatch grain mills and irrigation pumps.",
                    r.pv_kw - r.load_kw,
                    r.soc * 100.0
                ),
            )
        } else {
            (
                DispatchAction::Normal,
                format!(
                    "System operating normally. Battery at {:.0}%, critical reserve fully satisfied.",
                    r.soc * 100.0
                ),
            )
        };

        LocalDispatch {
            action,
            reason,
            critical_reserve_kwh,
            current_stored_kwh,
            reserve_satisfied,
            timestamp: r.ts,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_config() -> SiteConfig {
        SiteConfig {
            site_id: "demo-freetown".to_string(),
            kwp: 18.0,
            batt_kwh: 40.0,
            critical_kw: 2.5,
            peak_kw: 6.0,
        }
    }

    #[test]
    fn test_hard_critical_reserve_protection() {
        let dispatcher = LocalDispatcher::new(mock_config());

        // Low battery reading: 15% SoC (6 kWh < 7.5 kWh required for 3h critical reserve)
        let low_r = Reading {
            id: Some(1),
            ts: 1700000000,
            pv_kw: 1.0,
            load_kw: 2.5,
            soc: 0.15,
        };

        let dispatch = dispatcher.evaluate(&low_r, false);
        assert_eq!(dispatch.action, DispatchAction::ShedNonCritical);
        assert!(!dispatch.reserve_satisfied);
        assert!(dispatch.reason.contains("critical healthcare threshold"));
    }

    #[test]
    fn test_surplus_dispatch_during_sunny_conditions() {
        let dispatcher = LocalDispatcher::new(mock_config());

        // Surplus condition: 8.5 kW PV, 2.0 kW load, 80% SoC
        let high_r = Reading {
            id: Some(2),
            ts: 1700003600,
            pv_kw: 8.5,
            load_kw: 2.0,
            soc: 0.80,
        };

        let dispatch = dispatcher.evaluate(&high_r, false);
        assert_eq!(dispatch.action, DispatchAction::SurplusAgroProcessing);
        assert!(dispatch.reserve_satisfied);
        assert!(dispatch.reason.contains("Safe to dispatch grain mills"));
    }

    #[test]
    fn test_storm_precharge_precedence() {
        let dispatcher = LocalDispatcher::new(mock_config());

        let r = Reading {
            id: Some(3),
            ts: 1700007200,
            pv_kw: 4.0,
            load_kw: 2.0,
            soc: 0.50,
        };

        // Storm warning overrides normal conditions
        let dispatch = dispatcher.evaluate(&r, true);
        assert_eq!(dispatch.action, DispatchAction::PrechargeStorm);
        assert!(dispatch.reason.contains("Precharging battery"));
    }
}
