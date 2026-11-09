import hashlib
import hmac
import pytest
from pydantic import ValidationError
from app import Reading, Batch, sha, ok

def test_auth_hmac_logic():
    secret_key = "super-secret-key-12345"
    stored_hash = hashlib.sha256(secret_key.encode()).hexdigest()
    
    # Valid key matches
    assert ok(secret_key, stored_hash) is True
    
    # Wrong key fails
    assert ok("wrong-key", stored_hash) is False
    
    # Empty string fails against real key
    assert ok("", stored_hash) is False
    assert ok(None, stored_hash) is False

def test_reading_validation_success():
    r = Reading(pv_kw=5.2, load_kw=2.1, soc=0.75)
    assert r.pv_kw == 5.2
    assert r.load_kw == 2.1
    assert r.soc == 0.75
    assert r.ts is None

    r2 = Reading(ts=1700000000.0, pv_kw=0.0, load_kw=0.0, soc=0.0)
    assert r2.soc == 0.0

def test_reading_validation_failures():
    # Negative PV
    with pytest.raises(ValidationError):
        Reading(pv_kw=-0.1, load_kw=1.0, soc=0.5)

    # Negative load
    with pytest.raises(ValidationError):
        Reading(pv_kw=1.0, load_kw=-1.0, soc=0.5)

    # SoC > 1.0
    with pytest.raises(ValidationError):
        Reading(pv_kw=1.0, load_kw=1.0, soc=1.05)

    # SoC < 0.0
    with pytest.raises(ValidationError):
        Reading(pv_kw=1.0, load_kw=1.0, soc=-0.01)

    # Excessive PV (> 1000 kW)
    with pytest.raises(ValidationError):
        Reading(pv_kw=1001.0, load_kw=1.0, soc=0.5)

def test_batch_validation():
    # Empty batch is invalid
    with pytest.raises(ValidationError):
        Batch(readings=[])

    # Valid batch
    valid_batch = Batch(readings=[Reading(pv_kw=1.0, load_kw=1.0, soc=0.5)])
    assert len(valid_batch.readings) == 1

    # Oversized batch (> 500)
    oversized = [Reading(pv_kw=1.0, load_kw=1.0, soc=0.5)] * 501
    with pytest.raises(ValidationError):
        Batch(readings=oversized)

@pytest.mark.asyncio
async def test_api_health_endpoint():
    # Test via httpx against the running service or test client
    import httpx
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        try:
            res = await client.get("/health")
            if res.status_code == 200:
                data = res.json()
                assert data["ok"] is True
                assert "sites_forecasting" in data
        except httpx.ConnectError:
            pytest.skip("Local API server not accessible from this runner")
