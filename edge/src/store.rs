use crate::types::Reading;
use rusqlite::{params, Connection, Result};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Store {
    conn: Arc<Mutex<Connection>>,
}

impl Store {
    pub fn open(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS telemetry_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                pv_kw REAL NOT NULL,
                load_kw REAL NOT NULL,
                soc REAL NOT NULL,
                transmitted INTEGER DEFAULT 0
            )",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_untransmitted ON telemetry_queue(transmitted, id)",
            [],
        )?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute(
            "CREATE TABLE telemetry_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                pv_kw REAL NOT NULL,
                load_kw REAL NOT NULL,
                soc REAL NOT NULL,
                transmitted INTEGER DEFAULT 0
            )",
            [],
        )?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn enqueue(&self, r: &Reading) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO telemetry_queue (ts, pv_kw, load_kw, soc, transmitted) VALUES (?1, ?2, ?3, ?4, 0)",
            params![r.ts, r.pv_kw, r.load_kw, r.soc],
        )?;
        Ok(conn.last_insert_rowid())
    }

    #[allow(dead_code)]
    pub fn peek_untransmitted(&self, limit: usize) -> Result<Vec<Reading>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ts, pv_kw, load_kw, soc FROM telemetry_queue WHERE transmitted = 0 ORDER BY id ASC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok(Reading {
                id: Some(row.get(0)?),
                ts: row.get(1)?,
                pv_kw: row.get(2)?,
                load_kw: row.get(3)?,
                soc: row.get(4)?,
            })
        })?;

        let mut readings = Vec::new();
        for r in rows {
            readings.push(r?);
        }
        Ok(readings)
    }

    #[allow(dead_code)]
    pub fn mark_transmitted(&self, ids: &[i64]) -> Result<usize> {
        if ids.is_empty() {
            return Ok(0);
        }
        let conn = self.conn.lock().unwrap();
        let mut updated = 0;
        for &id in ids {
            updated += conn.execute(
                "UPDATE telemetry_queue SET transmitted = 1 WHERE id = ?1",
                params![id],
            )?;
        }
        Ok(updated)
    }

    pub fn untransmitted_count(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM telemetry_queue WHERE transmitted = 0",
            [],
            |r| r.get(0),
        )?;
        Ok(count as usize)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_forward_queue_resilience() {
        let store = Store::open_in_memory().expect("open sqlite in memory");

        // Simulate 30-minute network cut: 30 readings collected 1 minute apart
        for i in 0..30 {
            let r = Reading {
                id: None,
                ts: 1700000000 + i * 60,
                pv_kw: 4.5,
                load_kw: 1.2,
                soc: 0.75,
            };
            store.enqueue(&r).expect("enqueue reading");
        }

        assert_eq!(store.untransmitted_count().unwrap(), 30);

        // Network reconnected: Drain in batches of 10
        let batch1 = store.peek_untransmitted(10).unwrap();
        assert_eq!(batch1.len(), 10);
        let ids1: Vec<i64> = batch1.iter().map(|r| r.id.unwrap()).collect();
        store.mark_transmitted(&ids1).unwrap();

        assert_eq!(store.untransmitted_count().unwrap(), 20);

        // Drain remaining
        let batch2 = store.peek_untransmitted(50).unwrap();
        assert_eq!(batch2.len(), 20);
        let ids2: Vec<i64> = batch2.iter().map(|r| r.id.unwrap()).collect();
        store.mark_transmitted(&ids2).unwrap();

        assert_eq!(store.untransmitted_count().unwrap(), 0);
    }
}
