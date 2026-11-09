mod dispatch;
mod store;
mod types;

use chrono::Utc;
use dispatch::LocalDispatcher;
use store::Store;
use types::{Reading, SiteConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Layt Edge Agent v0.1.0 (Raspberry Pi Gateway) ===");

    let db_path = std::env::var("EDGE_DB_PATH").unwrap_or_else(|_| "edge_buffer.db".to_string());
    let store = Store::open(&db_path)?;
    println!("[Store] Initialized SQLite buffer at {}", db_path);

    let site_config = SiteConfig {
        site_id: std::env::var("SITE_ID").unwrap_or_else(|_| "kamb-01".to_string()),
        kwp: 20.0,
        batt_kwh: 45.0,
        critical_kw: 3.0,
        peak_kw: 7.5,
    };

    let dispatcher = LocalDispatcher::new(site_config);

    // Initial hardware test reading
    let sample = Reading {
        id: None,
        ts: Utc::now().timestamp(),
        pv_kw: 5.4,
        load_kw: 1.8,
        soc: 0.72,
    };

    let record_id = store.enqueue(&sample)?;
    println!("[Store] Queued test telemetry reading #{}", record_id);

    let dispatch = dispatcher.evaluate(&sample, false);
    println!(
        "[Dispatcher] Action: {:?} | Reserve: {:.1} kWh / Stored: {:.1} kWh",
        dispatch.action, dispatch.critical_reserve_kwh, dispatch.current_stored_kwh
    );
    println!("[Dispatcher] Reason: {}", dispatch.reason);

    let pending = store.untransmitted_count()?;
    println!("[Queue] Untransmitted buffer count: {}", pending);

    println!("=== Edge Agent Ready: Offline Store-and-Forward Active ===");
    Ok(())
}
