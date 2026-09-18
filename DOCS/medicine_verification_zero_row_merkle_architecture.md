# Scalable Medicine Verification System
## Zero-Row Code Generation + Merkle Tree Verification

> **Purpose:** Architectural blueprint for scaling a medicine verification system to approximately **20–30 million verification codes per day** using a 12-character alphanumeric code, stateless code generation, cryptographic hashing, and Merkle Trees.

---

## 1. Executive Summary

At a scale of 20–30 million medicine packages per day, storing every printed verification code as a conventional database row creates unnecessary storage and indexing overhead.

The proposed architecture replaces per-code database storage with:

1. A **distributed sequence/counter** for unique item IDs.
2. A **Format-Preserving Encryption (FPE)-style Feistel permutation** to transform the sequential ID into a printable 12-character code.
3. A **cryptographic leaf hash** for each medicine item.
4. A **daily Merkle Tree** that compresses millions of leaf hashes into a single Merkle Root.
5. **Immutable batch metadata** containing the Merkle Root and index range.
6. A high-throughput append-only storage layer for leaf hashes and operational status.
7. A verification service that decodes the code, locates its batch, obtains its Merkle proof, and verifies authenticity.

The important architectural principle is:

> **Do not use the database as the source of truth for every printed code. Use cryptographic commitments and deterministic addressing instead.**

---

# 2. Problem Statement

Assume a production volume of:

- 20–30 million medicine packages/day
- Up to ~900 million packages/month
- More than 10 billion packages/year at the upper end

A naive architecture might use:

```text
Generate Code
     ↓
INSERT code INTO medicines
     ↓
Create database index
     ↓
SMS lookup
```

At tens of millions of records per day, this produces enormous row counts and increasingly expensive indexes, backups, replication, migrations, and operational maintenance.

The proposed architecture instead follows:

```text
Distributed Counter
       ↓
Deterministic Code Permutation
       ↓
12-Character Printed Code
       ↓
Leaf Hash
       ↓
Append-Only Storage
       ↓
Daily Merkle Tree
       ↓
Single Merkle Root
```

---

# 3. High-Level Architecture

```text
                         MANUFACTURING SIDE
┌──────────────────────────────────────────────────────────┐
│ Production Line                                          │
│                                                          │
│  Distributed Counter                                    │
│         │                                                │
│         ▼                                                │
│  Code Generation / Feistel Permutation                  │
│         │                                                │
│         ├──────────────► 12-char code printed on pack   │
│         │                                                │
│         ▼                                                │
│  SHA-256 Leaf Hash                                       │
│         │                                                │
│         ▼                                                │
│  Append-Only Daily Leaf Store                            │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
                 End-of-Day Processing
                         │
                         ▼
                 ┌───────────────┐
                 │ Merkle Tree   │
                 └───────┬───────┘
                         │
                         ▼
                  Merkle Root
                         │
                         ▼
              Immutable Root Registry
                         │
                         │
                         ▼
                    SMS / API
                         │
                         ▼
                Verification Service
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Decode Code             Locate Batch
              │                     │
              └──────────┬──────────┘
                         ▼
                  Obtain Proof
                         │
                         ▼
                  Verify Root
                         │
                         ▼
              Authentic / Invalid
```

---

# 4. Core Design Principle: Zero-Row Code Generation

The system does **not** need a database row for every generated code merely to determine whether the code exists.

Instead, a global sequence number is transformed deterministically.

For example:

```text
Global ID
14,930,291
      │
      ▼
Feistel / FPE permutation
      │
      ▼
DLHI93820192
```

The reverse transformation provides:

```text
DLHI93820192
      │
      ▼
Feistel inverse
      │
      ▼
14,930,291
```

This means the code itself contains enough information to identify its logical position in the global sequence.

---

# 5. Important Security Clarification

A simple reversible encoding is **not encryption**.

For example:

```text
12345678 → ABCD1234
```

is predictable and therefore unsuitable for anti-counterfeiting.

The transformation must use a cryptographically secure keyed permutation.

Recommended approaches include:

- NIST FF1/FF3-1 where applicable
- A well-reviewed format-preserving encryption implementation
- A carefully designed Feistel construction using HMAC/AES as the round function

Do **not** invent cryptography for a production pharmaceutical system without security review.

The key should be stored in:

- AWS KMS / CloudHSM
- Azure Key Vault
- HashiCorp Vault
- Another enterprise-grade HSM/KMS system

Never hard-code the production key into application source code.

---

# 6. Code Space

For a format of:

```text
AAAA00000000
```

where:

- 4 positions are uppercase letters
- 8 positions are decimal digits

the theoretical space is:

\[
26^4 \times 10^8
\]

\[
= 456,976 \times 100,000,000
\]

\[
= 45,697,600,000,000
\]

Therefore, the theoretical namespace contains approximately:

**45.7 trillion codes.**

At 30 million allocations/day:

\[
45.7T / 30M \approx 1,523,253 \text{ days}
\]

or approximately:

**4,170 years**

of namespace capacity, ignoring reserved ranges and other operational constraints.

---

# 7. Distributed Counter

The first component is a globally unique monotonically increasing identifier.

Possible implementations:

### Option A — PostgreSQL sequence

Suitable when allocation throughput is manageable.

Use:

```sql
CREATE SEQUENCE medicine_global_seq
START WITH 1
INCREMENT BY 1
CACHE 10000;
```

Large cache allocations reduce sequence contention.

### Option B — Redis

Redis can provide high-throughput atomic counters:

```text
INCRBY medicine:global_counter 10000
```

Workers can reserve ranges:

```text
Worker A → 1–10,000
Worker B → 10,001–20,000
Worker C → 20,001–30,000
```

Workers then generate codes locally without contacting the counter for every package.

### Recommended approach

Use **range allocation** rather than one network request per item.

```text
Central Counter
      │
      ├── Worker A → 10,000 IDs
      ├── Worker B → 10,000 IDs
      ├── Worker C → 10,000 IDs
      └── Worker D → 10,000 IDs
```

This dramatically reduces coordination overhead.

---

# 8. Code Generation Pipeline

```text
Global ID
   │
   ▼
Keyed FPE / Feistel permutation
   │
   ▼
Permuted integer
   │
   ▼
Base representation
   │
   ▼
12-character printable code
```

Example:

```text
Global ID:
14,930,291

          ↓

Keyed permutation

          ↓

DLHI93820192
```

The printed code should be generated without requiring a database lookup.

---

# 9. Leaf Hash Construction

Each medicine package should have a cryptographically committed representation.

Example:

```text
LeafInput =
    code
    || batch_id
    || expiry
    || product_id
    || serial_number
    || domain_separator
```

Then:

```text
LeafHash = SHA-256(LeafInput)
```

A stronger production construction can use HMAC:

```text
LeafHash =
HMAC-SHA256(
    secret_key,
    canonical_medicine_record
)
```

The exact construction should be standardized and versioned.

Example:

```text
version = 1
product_id = P123
batch_id = B20260909
expiry = 2028-09-30
code = DLHI93820192
serial = 14930291
```

Canonicalization is important. Every producer and verifier must construct exactly the same byte representation.

---

# 10. Append-Only Leaf Storage

The system should not rely on a relational row for every item.

Instead, maintain an append-only structure:

```text
daily/
  2026-09-09/
      metadata.json
      leaves.bin
      status.log
      checksum
```

A conceptual record can be:

```json
{
  "global_index": 14930291,
  "leaf_hash": "a1b2c3...",
  "status": "ACTIVE"
}
```

However, for maximum efficiency, the production implementation can use fixed-size binary records.

A SHA-256 digest is 32 bytes.

Therefore:

```text
30,000,000 × 32 bytes
≈ 960 MB
```

for raw leaf hashes alone.

Additional metadata, indexing, compression, replication, and storage overhead must also be considered.

---

# 11. Merkle Tree Construction

For N leaves:

```text
Leaf 0
Leaf 1
Leaf 2
Leaf 3
...
Leaf N
```

Hash pairs:

```text
H01 = SHA256(Leaf0 || Leaf1)
H23 = SHA256(Leaf2 || Leaf3)
```

Then:

```text
H0123 = SHA256(H01 || H23)
```

Continue until one root remains:

```text
                     ROOT
                    /    \
                 H01      H23
                /  \      /  \
              L0   L1   L2   L3
```

For approximately 30 million leaves:

\[
\log_2(30,000,000) \approx 24.84
\]

So a proof contains roughly **25 sibling hashes**.

At 32 bytes/hash:

\[
25 \times 32 = 800 \text{ bytes}
\]

before encoding and metadata overhead.

---

# 12. Odd Number of Leaves

The implementation must define a deterministic rule when a tree layer contains an odd number of nodes.

One common approach is:

```text
H = SHA256(node || node)
```

For example:

```text
A B C

Level 1:
H(A||B)
H(C||C)
```

The exact rule must be part of the protocol specification.

An alternative is to use a duplicate-last-node convention.

Do not allow different services to implement different Merkle rules.

---

# 13. Merkle Root Sealing

At the end of the manufacturing window:

```text
30M leaf hashes
       │
       ▼
Merkle Tree
       │
       ▼
Merkle Root
```

Store the root in an immutable or append-only registry.

Example:

```sql
CREATE TABLE production_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    manufacturing_date DATE NOT NULL,
    start_index BIGINT NOT NULL,
    end_index BIGINT NOT NULL,
    item_count BIGINT NOT NULL,
    merkle_root CHAR(64) NOT NULL,
    tree_version INTEGER NOT NULL,
    is_sealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    sealed_at TIMESTAMP
);
```

Recommended indexes:

```sql
CREATE INDEX idx_production_range
ON production_batches(start_index, end_index);
```

---

# 14. Why the Root Is Important

The Merkle Root acts as a compact cryptographic commitment to the complete set of leaves.

Instead of storing:

```text
30,000,000 hashes
```

as the authenticity commitment, the verifier ultimately trusts:

```text
ONE 256-bit Merkle Root
```

The root should be protected against modification.

Possible protection mechanisms include:

- Write-once storage
- Object Lock / immutable storage
- Database append-only controls
- Digital signatures
- HSM-backed signing
- External timestamping/anchoring where appropriate

A practical design is:

```text
Merkle Root
    ↓
Digital Signature
    ↓
Immutable Root Registry
```

---

# 15. SMS Verification Flow

Customer sends:

```text
DLHI93820192
```

The request enters the verification service.

```text
SMS Gateway
     │
     ▼
Input Sanitizer
     │
     ▼
Code Parser
     │
     ▼
FPE Decoder
     │
     ▼
Global Index
     │
     ▼
Batch Locator
     │
     ▼
Leaf / Proof Store
     │
     ▼
Merkle Proof
     │
     ▼
Merkle Verification
     │
     ▼
Policy Engine
     │
     ▼
SMS Response
```

---

# 16. Step-by-Step Verification

### Step 1 — Sanitize

```text
" dlhi93820192 "
```

becomes:

```text
DLHI93820192
```

Validate:

- Length
- Character set
- Checksum/version if present
- Rate limit
- Abuse patterns

---

### Step 2 — Reverse the permutation

```text
DLHI93820192
       ↓
FPE inverse
       ↓
Global Index = 14,930,291
```

No database search is required for this operation.

---

### Step 3 — Locate production batch

Given:

```text
global_index = 14,930,291
```

find:

```text
start_index <= global_index <= end_index
```

The batch metadata table is tiny compared with the individual medicine dataset.

---

### Step 4 — Obtain the Merkle proof

The verifier needs the sibling hashes along the path from the target leaf to the root.

For approximately 30 million leaves:

```text
~25 sibling hashes
```

are required.

---

### Step 5 — Verify

Start with:

```text
current = leaf_hash
```

For each sibling:

```text
current = SHA256(current || sibling)
```

or:

```text
current = SHA256(sibling || current)
```

depending on whether the current node is the left or right child.

At the end:

```text
current == stored_merkle_root
```

means the leaf is cryptographically included in the committed tree.

---

# 17. Critical Architectural Correction

A Merkle Root alone is **not enough** to generate a Merkle proof.

This is an important distinction.

If you store only:

```text
Leaf hashes
+
Merkle root
```

you still need a way to efficiently retrieve the sibling nodes required for the proof.

Therefore, there are three practical designs.

## Design A — Store the entire tree

Store all tree levels.

Advantages:

- Very fast proofs
- Simple retrieval

Disadvantage:

- Additional storage

---

## Design B — Store leaves and rebuild proof path

Store all leaves sequentially.

When a proof is requested, reconstruct the required sibling nodes.

Advantages:

- Less persistent tree storage

Disadvantage:

- Potentially expensive unless optimized/cached

This is not inherently a sub-millisecond operation.

---

## Design C — Store a proof-oriented index

Store selected intermediate nodes/checkpoints.

Example:

```text
Leaves
  ↓
Level 1
  ↓
...
Checkpoint levels
  ↓
Merkle Root
```

This provides a balance between:

- Storage
- Proof latency
- Compute cost

For a high-volume SMS verification system, **Design C or a fully materialized tree is generally more realistic** than claiming that only the leaves plus the root automatically yield instant proofs.

---

# 18. Proof Storage

A proof record can conceptually look like:

```json
{
  "global_index": 14930291,
  "batch_id": 20260909,
  "leaf_hash": "a1b2c3...",
  "proof": [
    {
      "hash": "....",
      "position": "R"
    },
    {
      "hash": "....",
      "position": "L"
    }
  ]
}
```

For production, avoid JSON for extremely high-volume internal storage.

Binary fixed-size records are more efficient.

---

# 19. Storage Technology

Potential choices:

### RocksDB

Good for:

- Local high-speed random reads
- Embedded key-value workloads
- Sequential writes

### Cassandra / ScyllaDB

Good for:

- Distributed storage
- High write throughput
- Horizontal scaling
- Multi-node deployments

### Object Storage

Examples:

- Amazon S3
- Azure Blob Storage
- Google Cloud Storage

Good for:

- Immutable daily archives
- Cheap long-term storage
- Batch files
- Disaster recovery

A strong architecture is:

```text
Hot path:
Redis / RocksDB / ScyllaDB

Cold/archive path:
Object Storage
```

---

# 20. Suggested Production Storage Architecture

```text
                    Verification API
                          │
                          ▼
                       Redis
                   hot proof cache
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          Proof KV Store       Batch DB
        RocksDB/ScyllaDB      PostgreSQL
                │                   │
                └─────────┬─────────┘
                          ▼
                    Object Storage
                       S3/Blob
```

---

# 21. Redis Usage

Redis should not necessarily become the permanent source of truth.

Use it as a hot cache.

Examples:

```text
proof:{batch_id}:{leaf_index}
batch:{batch_id}
root:{batch_id}
status:{global_index}
```

Set appropriate TTLs depending on the business requirements.

For frequently verified medicines:

```text
SMS request
     ↓
Redis cache hit
     ↓
Merkle proof
```

This can reduce load on the persistent store.

---

# 22. Status and Recall Handling

Authenticity and business status are different concepts.

A valid Merkle proof means:

> This code belongs to the committed production dataset.

It does **not automatically mean**:

> This medicine is currently safe to consume.

A medicine may be:

```text
AUTHENTIC + ACTIVE
AUTHENTIC + RECALLED
AUTHENTIC + EXPIRED
AUTHENTIC + SUSPENDED
UNKNOWN
```

Therefore, use a separate status/policy layer.

Example:

```text
Merkle Verification
        ↓
Authenticity = TRUE
        ↓
Status Lookup
        ↓
ACTIVE / RECALLED / EXPIRED / SUSPENDED
```

---

# 23. Recommended Response Logic

### Valid + active

```text
Medicine verified successfully.
The code is authentic and the product is currently active.
```

### Valid + recalled

```text
The code is authentic, but this product has been recalled.
Do not use it and contact the appropriate authority/manufacturer.
```

### Invalid

```text
The code could not be verified.
Do not use the product until its authenticity is confirmed.
```

---

# 24. SMS Input Normalization

SMS users can make mistakes.

Common confusions include:

```text
O ↔ 0
I ↔ 1
S ↔ 5
B ↔ 8
```

However, blindly replacing characters can create false positives.

Recommended approach:

```text
Raw SMS
  ↓
Normalize case/whitespace
  ↓
Validate exact format
  ↓
Generate limited candidate interpretations
  ↓
Verify candidates cryptographically
  ↓
Accept only if exactly one candidate verifies
```

For example:

```text
DLHI93820192
```

should first be treated as an exact code.

Only use fuzzy correction as a controlled fallback.

---

# 25. Rate Limiting

SMS verification endpoints are exposed to abuse.

Implement:

```text
Per-phone rate limit
Per-IP rate limit
Per-code rate limit
Global rate limit
Carrier/source rate limit
```

Example conceptual policy:

```text
5 requests / minute / phone
20 requests / minute / IP
```

The actual values should be determined using operational traffic and fraud analysis.

Redis is well suited for distributed rate limiting.

---

# 26. Anti-Brute-Force Protection

A reversible code format means an attacker may be able to enumerate the namespace.

Therefore:

- Use a cryptographically secure permutation.
- Do not expose sequential IDs.
- Rate-limit verification attempts.
- Monitor repeated invalid codes.
- Consider adding a checksum/version component.
- Do not reveal internal sequence numbers in SMS responses.
- Rotate cryptographic keys using versioned key IDs where required.

---

# 27. Key Versioning

Production systems should support key rotation.

Instead of assuming:

```text
one permanent key
```

use:

```text
key_id = 2026_v1
```

and include a version indicator in the protocol if the format permits it.

Conceptually:

```text
Code
 ↓
Determine key version
 ↓
Load key from KMS/HSM
 ↓
Decode
```

Old codes remain verifiable after rotation.

---

# 28. Batch Model

A practical batch can be:

```text
Batch ID
Manufacturing date
Product ID
Start global index
End global index
Item count
Merkle root
Tree version
Key version
Creation timestamp
Seal timestamp
Signature
```

Example:

```json
{
  "batch_id": "B20260909-001",
  "date": "2026-09-09",
  "start_index": 14900000,
  "end_index": 14929999,
  "item_count": 30000,
  "merkle_root": "...",
  "tree_version": 1,
  "key_version": "2026-v1",
  "sealed": true
}
```

---

# 29. Daily vs Manufacturing-Batch Trees

The architecture does not strictly require one tree for the entire day.

Alternatives include:

### Daily tree

```text
30M items
     ↓
1 Merkle Root/day
```

### Hourly trees

```text
~1.25M items/hour
     ↓
24 roots/day
```

### Manufacturing-batch trees

```text
Production batch
     ↓
One Merkle Root
```

For operational scalability, **smaller independently sealed trees** can be easier to process and recover.

A hierarchy can also be used:

```text
Batch Roots
    ↓
Daily Root
    ↓
Monthly Root
```

---

# 30. Merkle Forest Architecture

At very high production volume, consider a Merkle forest.

```text
Factory Batch A
      ↓
   Root A

Factory Batch B
      ↓
   Root B

Factory Batch C
      ↓
   Root C

        ↓

     Daily
 Merkle Root
```

This enables:

- Parallel tree construction
- Independent batch processing
- Easier failure recovery
- Distributed manufacturing
- Smaller working sets

---

# 31. Parallel Merkle Construction

A 30-million-leaf tree should not necessarily be built by loading all hashes into Python memory.

Use a streaming or external-memory approach.

Conceptual pipeline:

```text
Leaf File
   ↓
Chunk
   ↓
Hash pairs
   ↓
Level-1 file
   ↓
Hash pairs
   ↓
Level-2 file
   ↓
...
   ↓
Root
```

This allows the system to process datasets larger than available RAM.

---

# 32. Recommended Implementation Languages

### Code generation

Prefer:

- Go
- Rust
- C++

These provide predictable high-throughput performance.

### Batch processing

Good choices:

- Go
- Rust
- Python with optimized/native libraries

Python is excellent for orchestration and prototyping but should not automatically be assumed to be the best choice for the hottest 30M-record cryptographic path.

### API service

Good choices:

- Go
- Java
- Node.js
- Rust

depending on team expertise and ecosystem.

---

# 33. Improved Python Reference Implementation

The original conceptual implementation demonstrates the algorithm, but it should not be treated as production cryptography.

Important production improvements include:

- Use a standardized FPE implementation.
- Use binary hashes rather than hexadecimal strings internally.
- Avoid rebuilding the entire tree in RAM.
- Define canonical serialization.
- Add batch/key/tree versioning.
- Store or index proof nodes.
- Separate authenticity from product status.
- Use KMS/HSM-backed secrets.
- Add rate limiting and monitoring.

---

# 34. Merkle Verification Pseudocode

```python
def verify_proof(leaf_hash, proof, expected_root):
    current = leaf_hash

    for step in proof:
        sibling = step["hash"]

        if step["position"] == "LEFT":
            current = sha256(sibling + current)
        else:
            current = sha256(current + sibling)

    return current == expected_root
```

The verifier needs only:

```text
leaf hash
+
Merkle proof
+
trusted Merkle root
```

to perform the cryptographic inclusion check.

---

# 35. End-to-End Example

Suppose the manufacturer receives:

```text
Global ID = 14,930,291
```

The code generator produces:

```text
DLHI93820192
```

The package is printed.

The leaf is computed:

```text
SHA256(
    DLHI93820192
    ||
    BATCH-2026-09
    ||
    2028-09-30
)
```

The resulting hash becomes a leaf.

At the end of the batch:

```text
30,000,000 leaves
        ↓
Merkle Tree
        ↓
Root =
9a4f...c812
```

The root is sealed.

Later:

```text
Customer SMS
DLHI93820192
```

The system performs:

```text
Decode
   ↓
14,930,291
   ↓
Locate batch
   ↓
Retrieve leaf/proof
   ↓
Recalculate root
   ↓
Compare with trusted root
```

If:

```text
calculated_root == stored_root
```

then the code is cryptographically included in that batch.

---

# 36. Complete Infrastructure

A production deployment can look like:

```text
                         ┌───────────────┐
                         │ Factory Lines │
                         └───────┬───────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ ID Range Service │
                        └────────┬────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            Worker A                       Worker B
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                         Code Generation
                                 │
                                 ▼
                            Leaf Hashing
                                 │
                                 ▼
                         Append-only Store
                                 │
                                 ▼
                        Object Storage / S3
                                 │
                                 ▼
                         Merkle Builder
                                 │
                                 ▼
                            Merkle Root
                                 │
                                 ▼
                       Immutable Root Store
                                 │
                                 │
       ┌─────────────────────────┴──────────────────────┐
       │                                                │
       ▼                                                ▼
 SMS Gateway                                       REST API
       │                                                │
       └──────────────────────┬─────────────────────────┘
                              ▼
                     Verification Service
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
            Redis        Batch DB        Proof Store
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                       Policy / Status
                              │
                              ▼
                       Verification Result
```

---

# 37. Kubernetes Deployment

For a cloud-native deployment:

```text
Kubernetes Cluster
│
├── code-generation-workers
├── ingestion-workers
├── merkle-builder-workers
├── verification-api
├── sms-handler
├── status-service
├── batch-service
└── monitoring
```

Horizontal Pod Autoscaling can scale the verification API independently from manufacturing workers.

---

# 38. Redis Cluster

Use Redis for:

- Distributed ID range allocation
- Hot proof cache
- Batch metadata cache
- Rate limiting
- Request deduplication
- Temporary processing state

Avoid treating Redis as the only durable storage for cryptographic commitments.

---

# 39. Observability

Track at minimum:

### Generation

```text
codes_generated/sec
counter_allocation_latency
worker_failures
duplicate_detection
```

### Merkle processing

```text
leaves_processed/sec
tree_build_duration
root_generation_failures
batch_seal_latency
```

### Verification

```text
requests/sec
p50 latency
p95 latency
p99 latency
cache_hit_rate
invalid_code_rate
proof_lookup_latency
```

### Security

```text
invalid attempts
repeated-code attempts
rate-limit violations
suspicious phone/IP activity
```

---

# 40. Disaster Recovery

Every sealed batch should be reproducible.

Store:

```text
Batch metadata
Leaf data
Merkle root
Tree version
Key version
Algorithm version
Digital signature
Checksums
```

Object storage should use:

- Versioning
- Replication
- Immutable retention where appropriate
- Lifecycle policies
- Cross-region backup for critical data

---

# 41. Data Integrity

Every daily file should have a checksum.

Example:

```text
leaves.bin
     ↓
SHA-256
     ↓
file_checksum
```

Store:

```text
file_checksum
+
Merkle_root
+
batch_metadata
```

This allows operators to distinguish:

- File corruption
- Tree corruption
- Database corruption
- Application bugs

---

# 42. Performance Expectations

Do not hard-code claims such as:

> "25 database rows always take under 2 ms."

Actual latency depends on:

- Network round trips
- Storage engine
- Cache hit rate
- Database load
- Serialization
- Cloud region
- SMS gateway latency

The cryptographic verification itself is cheap.

The dominant latency in an SMS workflow may instead come from:

```text
SMS carrier
+
SMS gateway
+
network
+
database/cache access
```

Therefore, benchmark the complete pipeline rather than assuming a theoretical database lookup time.

---

# 43. Scalability Model

At 30 million items/day:

```text
30M/day
≈ 1.25M/hour
≈ 20,833/minute
≈ 347/second average
```

This average rate is relatively manageable for modern distributed infrastructure.

The real challenge is not average throughput alone.

Design for manufacturing bursts such as:

```text
10× average
20× average
50× average
```

depending on production-line behavior.

Range-based ID allocation and horizontally scalable workers make these bursts easier to absorb.

---

# 44. Main Advantages

### 1. Reduced database growth

No conventional relational row is required simply to represent every generated code.

### 2. Stateless code generation

Workers can generate codes independently after receiving ID ranges.

### 3. Cryptographic authenticity

The Merkle Root provides a tamper-evident commitment to the production dataset.

### 4. Efficient proofs

A proof contains approximately:

\[
O(\log N)
\]

hashes.

### 5. Horizontal scalability

Generation and verification workers can scale independently.

### 6. Cheap archival

Daily immutable files can be placed in object storage.

---

# 45. Limitations

The architecture is not literally "zero storage."

It eliminates **individual relational database rows for code generation**, but the system still needs durable storage for:

- Leaf hashes or equivalent commitments
- Merkle proof material
- Batch metadata
- Recall/status information
- Audit logs
- Keys and key metadata
- Immutable roots

Also:

> A Merkle Tree proves inclusion, not physical authenticity of the medicine.

If a genuine code is copied onto counterfeit packaging, a pure code-verification system may not detect the duplication.

This is a critical anti-counterfeiting limitation.

---

# 46. Stronger Anti-Counterfeit Design

For pharmaceutical-grade systems, combine the cryptographic code with additional signals:

```text
Printed Code
     +
Tamper-evident packaging
     +
QR / DataMatrix
     +
Batch information
     +
Manufacturing provenance
     +
Scan history
     +
Anomaly detection
```

For example:

```text
Same code scanned
    ↓
India
    ↓
5 minutes later
    ↓
Brazil
```

This can trigger a fraud/anomaly alert even if the cryptographic proof remains valid.

---

# 47. Recommended Final Architecture

The strongest practical architecture is:

```text
                   CODE GENERATION
                          │
                          ▼
                Distributed ID Ranges
                          │
                          ▼
              Standardized FPE / FF1
                          │
                          ▼
                    12-char Code
                          │
                          ▼
                 Canonical Leaf Hash
                          │
                          ▼
              Append-only Leaf Storage
                          │
                          ▼
                  Parallel Merkle Job
                          │
                          ▼
                    Merkle Root
                          │
                          ▼
             Signed + Immutable Root
                          │
                          ▼
                    Root Registry


                   VERIFICATION
                          │
                          ▼
                     SMS / API
                          │
                          ▼
                 Normalize + Validate
                          │
                          ▼
                    FPE Decode
                          │
                          ▼
                   Global Index
                          │
                          ▼
                    Batch Lookup
                          │
                          ▼
                  Proof Retrieval
                          │
                          ▼
                 Merkle Verification
                          │
                          ▼
                Authenticity Decision
                          │
                          ▼
                 Status / Recall Check
                          │
                          ▼
                    Final Response
```

---

# 48. Final Recommendation

For a 20–30 million/day system, use the following principles:

| Component | Recommended Design |
|---|---|
| ID allocation | Distributed range allocation |
| Code generation | Standardized keyed FPE |
| Code length | 12-character namespace |
| Leaf hashing | SHA-256/HMAC-SHA-256 |
| Tree | Binary Merkle Tree |
| Hot cache | Redis |
| Proof storage | RocksDB / ScyllaDB / Cassandra |
| Metadata | PostgreSQL |
| Archive | S3 / Azure Blob / equivalent object storage |
| Secrets | KMS / HSM |
| Processing | Parallel Go/Rust workers |
| Verification | Horizontally scalable API |
| Abuse protection | Redis-based rate limiting |
| Root protection | Signed + immutable storage |
| Recall state | Separate status/policy database |
| Monitoring | Prometheus/Grafana/OpenTelemetry |
| Deployment | Kubernetes |

---

# 49. Key Takeaway

The fundamental idea is not:

> "Store 30 million medicine codes efficiently."

It is:

> **Transform the code into a deterministic cryptographic address, commit the production dataset into a Merkle Tree, and verify membership using a logarithmic-size proof.**

The architecture therefore separates four concerns:

```text
Identity
   ↓
Global sequence / code

Commitment
   ↓
Merkle Tree

Verification
   ↓
Merkle Proof

Business State
   ↓
Active / Recalled / Expired / Suspended
```

This separation is what makes the architecture scalable, auditable, and suitable for high-volume verification workloads.

---

## 50. Production Checklist

Before deploying, verify all of the following:

- [ ] Standardized FPE algorithm selected
- [ ] Cryptographic implementation independently reviewed
- [ ] Keys stored in KMS/HSM
- [ ] Key rotation strategy defined
- [ ] Code namespace collision analysis completed
- [ ] Counter range allocation implemented
- [ ] Canonical leaf serialization defined
- [ ] Hash algorithm/version defined
- [ ] Merkle odd-node rule defined
- [ ] Merkle tree versioned
- [ ] Proof storage strategy selected
- [ ] Immutable root registry implemented
- [ ] Batch sealing process implemented
- [ ] Recall/status system separated from authenticity
- [ ] SMS rate limiting implemented
- [ ] Abuse detection implemented
- [ ] Disaster recovery tested
- [ ] End-to-end latency benchmarked
- [ ] Manufacturing burst load tested
- [ ] Duplicate-code/fraud scenarios tested
- [ ] Audit logging implemented
- [ ] Security penetration testing completed

---

**Note:** This document is an architectural reference, not a production cryptography specification. Pharmaceutical deployment should undergo security review, threat modeling, compliance review, and performance testing before implementation.
