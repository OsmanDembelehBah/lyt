use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Reading {
    pub id: Option<i64>,
    pub ts: i64,
    pub pv_kw: f64,
    pub load_kw: f64,
    pub soc: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteConfig {
    pub site_id: String,
    pub kwp: f64,
    pub batt_kwh: f64,
    pub critical_kw: f64,
    pub peak_kw: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DispatchAction {
    Normal,
    SurplusAgroProcessing,
    PrechargeStorm,
    ShedNonCritical,
    DustCleaningRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalDispatch {
    pub action: DispatchAction,
    pub reason: String,
    pub critical_reserve_kwh: f64,
    pub current_stored_kwh: f64,
    pub reserve_satisfied: bool,
    pub timestamp: i64,
}
