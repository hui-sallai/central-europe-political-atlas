import assert from "node:assert/strict";

// Review annotations are separate from immutable ballot provenance. This staging
// gate deliberately cannot approve canonical ingestion or continuous series.
const reviewFields=new Set(["historical_display_label","atlas_party_id","contestant_kind","match_status","readiness","match_basis","reviewed_at","reviewer_note","review_evidence","second_review"]);
export function validateIdentityReview(existing,generated){
  assert.equal(existing.rows.length,generated.rows.length,"Source scope changed; explicit migration required");
  const bySource=new Map(existing.rows.map(row=>[row.source_record_id,row]));
  assert.equal(bySource.size,existing.rows.length,"Duplicate immutable source record");
  assert.equal(new Set(existing.rows.map(row=>row.contestant_id)).size,existing.rows.length,"Duplicate contestant ID");
  for(const expected of generated.rows){
    const row=bySource.get(expected.source_record_id);
    assert.ok(row,"Missing immutable source record");
    for(const [key,value] of Object.entries(expected))if(!reviewFields.has(key))assert.deepEqual(row[key],value,`Immutable field changed: ${key}`);
    for(const key of Object.keys(row))assert.ok(key in expected||reviewFields.has(key),`Unknown review field: ${key}`);
    assert.equal(row.canonical_promotion,false);
    assert.equal(row.eligible_for_continuous_party_series,false);
    assert.equal(row.readiness,"requires_manual_review");
    assert.ok(["unmatched","provisional"].includes(row.match_status),"Staging cannot confirm party continuity");
    if(row.match_status==="unmatched"){
      for(const key of ["historical_display_label","atlas_party_id","contestant_kind","match_basis","reviewed_at"])assert.equal(row[key],null,"Unmatched row cannot contain approved review fields");
    }else{
      assert.match(row.atlas_party_id??"",/^pp-de-\d{4}$/);
      for(const key of ["historical_display_label","contestant_kind","match_basis","reviewer_note"])assert.ok(typeof row[key]==="string"&&row[key].trim(),`Missing review field: ${key}`);
      assert.ok(Number.isFinite(Date.parse(row.reviewed_at)),"Missing review timestamp");
      assert.ok(Array.isArray(row.review_evidence)&&row.review_evidence.length>0,"Manual review requires cited evidence");
      for(const evidence of row.review_evidence){
        assert.ok(typeof evidence.note==="string"&&evidence.note.trim());
        assert.match(evidence.source_record_id??"",/\S+/);
        assert.match(evidence.source_sha256??"",/^[a-f0-9]{64}$/);
      }
      assert.ok(row.second_review==null,"Second-review acceptance needs a separate production gate");
    }
  }
  for(const [key,value] of Object.entries(generated))if(key!=="rows")assert.deepEqual(existing[key],value,`Queue envelope changed: ${key}`);
  return existing.rows.filter(row=>row.match_status==="provisional").length;
}
