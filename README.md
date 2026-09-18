# 💊 PharmaChain: National Cryptographic Drug Provenance & Track-and-Trace Infrastructure
### Smart India Hackathon (SIH 2026) | Decentralized Anti-Counterfeit Medicine Network

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F.svg?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_51-000020.svg?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger_Fabric-v2.5_LTS-2F3134.svg?style=for-the-badge&logo=hyperledger&logoColor=white)](https://www.hyperledger.org/projects/fabric)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Skaffold_Orchestrated-326CE5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Cryptography](https://img.shields.io/badge/Cryptography-ECDSA_P--256_|_ES256-E34F26.svg?style=for-the-badge)](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📌 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [The Three-Tier Ecosystem Breakdown](#3-the-three-tier-ecosystem-breakdown)
   - [Tier 1: Frontend Applications (3 Dashboards + 2 Mobile Apps)](#tier-1-frontend-applications)
   - [Tier 2: Cloud-Native Microservices Cluster (`server/`)](#tier-2-cloud-native-microservices-cluster)
   - [Tier 3: Distributed Ledger & Smart Contracts (`blockchain-server/`)](#tier-3-distributed-ledger--smart-contracts)
4. [Cryptographic Vault & Two-Tier Serialization](#4-cryptographic-vault--two-tier-serialization)
5. [Supply Chain State Machine & Custody Lifecycle](#5-supply-chain-state-machine--custody-lifecycle)
6. [Complete End-to-End Sequence Flow](#6-complete-end-to-end-sequence-flow)
7. [Threat Model & Security Defense Matrix](#7-threat-model--security-defense-matrix)
8. [Network Topology & Port Registry](#8-network-topology--port-registry)
9. [Repository Blueprint & File Structure](#9-repository-blueprint--file-structure)
10. [Step-by-Step Installation & Running Guide](#10-step-by-step-installation--running-guide)

---

## 1. Executive Summary & Problem Statement

Counterfeit, substandard, and diverted pharmaceuticals represent a **₹40,000+ Crore annual shadow economy in India**, posing severe public health risks.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE "DUMB QR CODE" VULNERABILITY                                      │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ❌ The Photocopy / Clone Flaw │ Anyone with a scanner can buy 1 genuine medicine blister, photocopy its │
│                               │ QR code 10,000 times, and paste it on 10,000 chalk-filled fake strips.   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ ❌ No Cryptographic Proof     │ Traditional 1D/2D barcodes contain plain text (URL/ID). They have no    │
│                               │ digital signature proving if Cipla, Sun Pharma, or a counterfeiter made │
│                               │ the label.                                                              │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ ❌ Zero Recall Speed          │ When contamination occurs, manual phone/email recalls take weeks,       │
│                               │ leaving toxic batches in pharmacy shelves and consumer hands.           │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### The PharmaChain Solution
PharmaChain establishes an **unforgeable mathematical and blockchain-backed provenance infrastructure**:
* **Military-Grade Asymmetric Signatures (ECDSA NIST P-256 / ES256)**: Every medicine pack is minted with a unique cryptographically signed JSON Web Token (JWT) containing a high-entropy CSPRNG nonce.
* **Immutable Hyperledger Fabric Ledger**: Custody events (`MINTED` $\to$ `INTAKE` $\to$ `SOLD` $\to$ `RECALLED`) are committed on-chain. If a cloned barcode is scanned twice, the system instantly triggers a **`DUPLICATE_INTAKE`** or **`ALREADY_SOLD (Clone Detected)`** warning.
* **Instant Regulatory Recall Kill-Switch**: A single recall transaction broadcast by CDSCO or the manufacturer instantly locks POS dispensing across all pharmacies nationwide in **< 100 milliseconds**.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TB
    subgraph FRONTEND["🖥️ FRONTEND LAYER"]
        MFR_WEB["🏭 Manufacturer Dashboard<br/>(React + Vite :5173)"]
        ADM_WEB["🏛️ CDSCO Admin Portal<br/>(React + Vite :5174)"]
        SHP_WEB["🏪 Shopkeeper Web Portal<br/>(React + Vite :5175)"]
        SHP_MOB["📱 Pharmacist Mobile App<br/>(Expo React Native)"]
        CUST_MOB["🧑‍⚕️ Citizen Mobile App<br/>(Expo React Native)"]
    end

    subgraph INGRESS["🌐 HIGH-PERFORMANCE LAN BRIDGE & EDGE ROUTER"]
        LAN_PROXY["⚡ LAN TCP Proxy Daemon (:3001-:3005, :4000)<br/>Auto-Routes Mobile Wi-Fi to K8s Nodes"]
    end

    subgraph K8S["☸️ KUBERNETES MICROSERVICES CLUSTER (server/)"]
        MFR_SVC["🏭 manufacturer-service (:3001)<br/>Batch Lifecycle & S3 Pipeline"]
        SHP_SVC["🏪 shopkeeper-service (:3002)<br/>Inbound Intake & POS Dispense"]
        CON_SVC["🧑‍⚕️ consumer-service (:3003)<br/>Public Verification & Trust Score"]
        ADM_SVC["🏛️ admin-service (:3005)<br/>KYC Approval & Recall Directives"]
        CORE_SVC["🔐 pharma-core-service (:4000)<br/>ECDSA ES256 Vault, Merkle Tree & JWKS"]
    end

    subgraph BLOCKCHAIN["⛓️ HYPERLEDGER FABRIC 2.5 DISTRIBUTED LEDGER (blockchain-server/)"]
        GW_SVC["☕ Spring Boot REST Gateway (:8080)<br/>Nimbus JWT Auth & Fabric Java SDK"]
        PEER_0["📦 Peer0 Org1 (:7051, :7052)<br/>Endorsement & Ledger Validator"]
        ORDERER["⚖️ Raft Orderer (:7050)<br/>Consensus & Block Sequencer"]
        COUCHDB["🗄️ CouchDB (:5984)<br/>World State Key-Value Store"]
        SMART_CONTRACT["📜 pharmacc.jar (Chaincode)<br/>Custody State Machine Engine"]
    end

    FRONTEND -->|HTTPS / REST API| LAN_PROXY
    LAN_PROXY --> K8S
    K8S -->|Internal Cluster RPC| CORE_SVC
    K8S -->|gRPC / REST Bridge| GW_SVC
    GW_SVC --> PEER_0
    PEER_0 <--> COUCHDB
    PEER_0 --> SMART_CONTRACT
    GW_SVC --> ORDERER
    ORDERER --> PEER_0
```

---

## 3. The Three-Tier Ecosystem Breakdown

### Tier 1: Frontend Applications

```mermaid
graph LR
    subgraph "5 Unified Frontends"
        A["🏭 Manufacturer Dashboard<br/>• Batch Creation Wizard (35+ Specs)<br/>• GS1 2D DataMatrix / QR Hub<br/>• S3 CSV Manifest Downloader<br/>• Batch Recall Trigger"]
        B["🏛️ CDSCO Admin Portal<br/>• Manufacturer & Chemist KYC<br/>• Nationwide Surveillance<br/>• Cryptographic Key Registry<br/>• Emergency Recall Broadcast"]
        C["🏪 Shopkeeper Web Portal<br/>• Real-time Inventory Insights<br/>• Stock Depletion & Expiry Alerts<br/>• POS Transaction Audit"]
        D["📱 Pharmacist Mobile App<br/>• Inbound Stock Scanner<br/>• Instant Duplicate Detection<br/>• POS Dispense to Consumer<br/>• Offline Cache & Auto-Sync"]
        E["🧑‍⚕️ Citizen Mobile App<br/>• Zero-Friction QR Scan<br/>• Authenticity Trust Score (0-100)<br/>• Drug Schedule & Leaflet View<br/>• Counterfeit & Recall Warnings"]
    end
```

---

### Tier 2: Cloud-Native Microservices Cluster

| Service Name | Port | Primary Responsibilities | Storage / Tech |
| :--- | :---: | :--- | :--- |
| **`manufacturer-service`** | `3001` | Batch generation, CDSCO Tier-2 formulations, automatic ES256 mint scheduling, S3 streaming. | MongoDB, Express.js, Axios |
| **`shopkeeper-service`** | `3002` | Retail intake verification, duplicate pack blocking, POS dispensing, inventory tracking. | MongoDB, Express.js |
| **`consumer-service`** | `3003` | Public scan lookup, cryptographic signature audit, patient safety leaflet display. | Express.js, Node.js |
| **`admin-service`** | `3005` | Regulatory KYC approval, cryptographic public key auditing, nationwide recall coordination. | MongoDB, Express.js |
| **`pharma-core-service`** | `4000` | Asymmetric ECDSA signing engine, AES-256-GCM keystore vault, Merkle tree genesis, JWKS server. | Node.js Crypto, Scrypt, S3 |

---

### Tier 3: Distributed Ledger & Smart Contracts

```mermaid
graph TD
    subgraph "Hyperledger Fabric 2.5 Architecture"
        CA1["ca.org1.pharmachain.net (:7054)<br/>X.509 Identity Enrollment"]
        ORDERER_NODE["orderer.pharmachain.net (:7050)<br/>Raft Single-Node Consensus"]
        PEER_NODE["peer0.pharmachain.net (:7051)<br/>Endorsement & Validation"]
        WORLD_STATE["couchdb0 (:5984)<br/>JSON World State Index"]
        SPRING_GW["pharma-backend (:8080)<br/>Spring Boot REST Gateway Client"]
        CONTRACT["pharmacc.jar<br/>Java Smart Contract State Machine"]
    end

    SPRING_GW -->|Mutual TLS gRPC| PEER_NODE
    PEER_NODE --> CONTRACT
    CONTRACT --> WORLD_STATE
    SPRING_GW --> ORDERER_NODE
```

---

## 4. Cryptographic Vault & Two-Tier Serialization

PharmaChain divides serialization data into **Tier 1 (On-Blister Cryptography)** and **Tier 2 (Rich Regulatory Cloud Metadata)**:

```mermaid
classDiagram
    class Tier1_CryptographicQR {
        +String batchId
        +String serialNumber
        +String expiryDate
        +String manufacturerId
        +String nonce (CSPRNG 64-bit)
        +String timestamp
        +String ECDSA_ES256_Signature
        +generatePackHash() String
        +verifySignature(publicKey) Boolean
    }

    class Tier2_CloudRegulatorySpecs {
        +String medicineName
        +String genericName
        +String brandName
        +String therapeuticCategory
        +Enum drugSchedule (H, H1, X, G, OTC)
        +Enum pharmacopoeia (IP, BP, USP, EP)
        +String composition (API Specs)
        +String dosage & strength
        +String manufacturingLicenseNo
        +String cdscoApprovalNo
        +Date manufacturingDate
        +Date expiryDate
        +String storageConditions
        +String productionSite
    }

    Tier1_CryptographicQR --> Tier2_CloudRegulatorySpecs : Resolved via packHash
```

### Digital Signature Standard:
$$\text{Signature} = \text{ECDSA}_{\text{PrivKey}_{\text{MFR}}}(\text{SHA-256}(\text{Header} \parallel \text{Payload}))$$
* **Algorithm**: `ES256` (ECDSA on NIST P-256 curve with SHA-256 hash).
* **Key Protection**: Encrypted at rest using **AES-256-GCM** with master vault keys derived via `scrypt`.
* **Discovery**: Public keys published globally via RFC 7517 compliant JWKS at `http://pharma-core:4000/.well-known/jwks.json`.

---

## 5. Supply Chain State Machine & Custody Lifecycle

```mermaid
stateDiagram-v2
    [*] --> MINTED: Batch Created & Cryptographically Signed
    
    MINTED --> IN_TRANSIT: Dispatched to Logistics Provider
    
    IN_TRANSIT --> AT_SHOP: Pharmacist Inbound Scan (Intake Accepted)
    AT_SHOP --> AT_SHOP: Duplicate Scan Attempt (DUPLICATE_INTAKE Rejected 🚫)
    
    AT_SHOP --> SOLD: Pharmacist Dispense Scan (Point of Sale)
    SOLD --> SOLD: Duplicate Dispense / Clone Scan (COUNTERFEIT WARNING ⚠️)
    
    MINTED --> RECALLED: CDSCO Emergency Batch Recall
    IN_TRANSIT --> RECALLED: CDSCO Emergency Batch Recall
    AT_SHOP --> RECALLED: CDSCO Emergency Batch Recall
    
    RECALLED --> [*]: Permanent Lock (All Scans Flag RECALLED)
    SOLD --> [*]: Consumed by Patient
```

---

## 6. Complete End-to-End Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor MFR as 🏭 Manufacturer
    participant DASH as 🖥️ Manufacturer Web
    participant CORE as 🔐 pharma-core
    participant FAB as ⛓️ Blockchain (Fabric)
    actor PHARM as 🏪 Chemist / Pharmacist
    participant APP as 📱 Shopkeeper App
    actor USER as 🧑‍⚕️ Consumer / Patient

    %% Batch Creation
    MFR->>DASH: Register Batch (e.g. Augmentin 625, 200 units)
    DASH->>CORE: POST /core/batch/mint (Auto-Mint)
    CORE->>CORE: Generate 200 ES256 Signed JWTs + CSPRNG Nonces
    CORE->>FAB: Record Genesis State (:MINTED)
    CORE-->>DASH: Generated S3 CSV Manifest with QR Tokens
    DASH-->>MFR: Batch Status: ● MINTED & Scannable QR Ready

    %% Inbound Stock Reception
    PHARM->>APP: Scan Inbound Blister Pack (Inbound Mode)
    APP->>CORE: POST /core/hash/verify (Cryptographic ECDSA Audit)
    CORE-->>APP: Signature Valid (98/100 Authenticity Trust Score)
    APP->>FAB: POST /api/transition (INTAKE / AT_SHOP)
    FAB-->>APP: Stock Inbound Accepted ✅ (Added to Store Inventory)

    %% Duplicate Intake Attempt
    PHARM->>APP: Scan SAME Pack Again (Duplicate Test)
    APP->>FAB: POST /api/transition (INTAKE)
    FAB-->>APP: 🚫 409 Conflict: DUPLICATE_INTAKE Rejected

    %% POS Dispense
    PHARM->>APP: Scan Pack for Customer Sale (Dispense Mode)
    APP->>FAB: POST /api/transition (SOLD)
    FAB-->>APP: Sale Confirmed 🛒 (Recorded On-Chain)

    %% Consumer Verification
    USER->>USER: Scan Pack with Citizen App / Smartphone Camera
    USER->>CORE: GET /core/hash/verify
    CORE-->>USER: ✅ Genuine Medicine (Authentic, Sold by Verified Pharmacy)
```

---

## 7. Threat Model & Security Defense Matrix

| Threat Vector | Attack Mechanism | PharmaChain Defense Mechanism |
| :--- | :--- | :--- |
| **Photocopy / QR Cloning** | Counterfeiter copies a valid QR and prints 10,000 labels. | **Blockchain Custody Check**: Once pack is marked `SOLD`, subsequent scans trigger `ALREADY_SOLD / DUPLICATE CLONE`. |
| **Signature Forgery** | Attacker crafts a fake QR with modified expiry date. | **ECDSA NIST P-256 Curve Math**: Signature verification fails immediately ($0/100$ Trust Score). |
| **Front-Running / Diversion** | Retailer sells stolen medicine without receiving it. | **State Machine Enforce**: Cannot execute `SOLD` unless previous state is `AT_SHOP`. |
| **Serial Guessing** | Pre-printing sequential numbers (`001`, `002`). | **CSPRNG 64-bit Nonce**: Every pack has cryptographically unpredictable entropy. |
| **Private Key Theft** | Hacker tries extracting manufacturer signing keys. | **AES-256-GCM Sealed Keystore**: Master vault keys derived with `scrypt` memory-hard hashing. |
| **Network Interception** | Man-in-the-Middle on mobile Wi-Fi scan requests. | **Mutual TLS & LAN Bridge TCP Tunneling**: Encrypted point-to-point payloads. |

---

## 8. Network Topology & Port Registry

```
┌──────────────────────────────┬──────────┬─────────────────────────────────────────────────────────────────┐
│ Service Component            │ Port     │ Technology & Protocol                                           │
├──────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────┤
│ Manufacturer Dashboard       │ 5173     │ React 18, Vite, Redux Toolkit, TailwindCSS                      │
│ CDSCO Admin Dashboard        │ 5174     │ React 18, Vite, Lucide Icons                                    │
│ Shopkeeper Dashboard         │ 5175     │ React 18, Vite                                                  │
│ Shopkeeper Mobile Scanner    │ 8081     │ React Native, Expo SDK 51, Camera Barcode Scanner               │
│ Consumer Citizen App         │ 8082     │ React Native, Expo SDK 51                                       │
│ manufacturer-service         │ 3001     │ Node.js 20, Express, MongoDB Atlas, REST                        │
│ shopkeeper-service           │ 3002     │ Node.js 20, Express, MongoDB Atlas, REST                        │
│ consumer-service             │ 3003     │ Node.js 20, Express, REST                                       │
│ admin-service                │ 3005     │ Node.js 20, Express, MongoDB Atlas, REST                        │
│ pharma-core-service          │ 4000     │ Node.js 20, WebCrypto, ES256, Merkle Engine, JWKS Server        │
│ Spring Boot Fabric Gateway   │ 8080     │ Java 17, Spring Boot 3, Nimbus OAuth2, Fabric Java SDK          │
│ Hyperledger Fabric Peer      │ 7051     │ gRPC, mutual TLS, Hyperledger Fabric 2.5                        │
│ Hyperledger Fabric Orderer   │ 7050     │ Raft Consensus Engine, gRPC                                     │
│ Fabric CouchDB State DB      │ 5984     │ CouchDB 3.3 REST JSON Store                                     │
│ LAN Proxy Bridge Daemon      │ 3001-4000│ Node.js net TCP Bridge (Proxies Wi-Fi 192.168.x.x to K8s)       │
└──────────────────────────────┴──────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 9. Repository Blueprint & File Structure

```
SIH-Pharma/
├── blockchain-server/                  # ⛓️ Hyperledger Fabric 2.5 Network & Gateway
│   ├── backend/                        # Spring Boot REST Gateway (:8080)
│   ├── chaincode/                      # Java Smart Contracts (pharmacc.jar)
│   ├── organizations/                  # Fabric CA, MSP Credentials, TLS Certs
│   ├── scripts/                        # Channel creation & chaincode deployment scripts
│   └── docker-compose.yml              # Complete Fabric container stack
│
├── server/                             # ☸️ Kubernetes Microservices Cluster
│   ├── k8s/                            # Unified Kubernetes deployment manifests & secrets
│   ├── scripts/
│   │   └── lan-bridge.js               # ⚡ High-performance TCP proxy for mobile Wi-Fi testing
│   ├── services/
│   │   ├── admin/                      # Central CDSCO regulatory microservice (:3005)
│   │   ├── consumer/                   # Public consumer scan & verification service (:3003)
│   │   ├── manufacturer/               # Batch creation, S3 CSV pipeline, KYC (:3001)
│   │   ├── pharma-core/                # ECDSA ES256 crypto engine & JWKS server (:4000)
│   │   └── shopkeeper/                 # Pharmacy inventory & POS dispense service (:3002)
│   ├── skaffold.yml                    # Skaffold live sync & container build config
│   └── package.json
│
└── frontend/                           # 🖥️ Web Dashboards & Mobile Applications
    ├── Admin-DashBoard/                # CDSCO Administrator web portal (:5174)
    ├── Manufacture-DashBoard/          # Pharmaceutical Manufacturer portal (:5173)
    ├── Shopkeeper-DashBoard/           # Pharmacy web operations portal (:5175)
    ├── shopkeeper-mobile/              # React Native / Expo app for Chemists
    └── customer-mobile/                # React Native / Expo app for Consumers
```

---

## 10. Step-by-Step Installation & Running Guide

### Prerequisites
* **Node.js**: v20.x or higher
* **Docker Desktop**: Enabled with Kubernetes
* **Skaffold & kubectl**: Installed and in system PATH
* **Expo Go**: Installed on physical Android / iOS testing device

---

### Step 1: Start Hyperledger Fabric Blockchain Stack
```bash
cd blockchain-server
docker compose up --build -d
```
*Verify gateway health*: Open `http://localhost:8080/actuator/health` $\to$ returns `{"status":"UP"}`.

---

### Step 2: Start Kubernetes Microservices Cluster
```bash
cd server
skaffold dev
```
*All 5 services (`manufacturer`, `shopkeeper`, `consumer`, `admin`, `pharma-core`) will deploy into your local cluster with live port-forwarding.*

---

### Step 3: Launch LAN Bridge Proxy (For Mobile Device Wi-Fi Connectivity)
```bash
cd server
npm run lan-bridge
```
*This binds your computer's Wi-Fi IP (`192.168.x.x`) to the internal Kubernetes port-forwards, enabling physical phones to scan and communicate seamlessly.*

---

### Step 4: Run Web Dashboards
```bash
# Manufacturer Dashboard (:5173)
cd frontend/Manufacture-DashBoard
npm install && npm run dev

# Admin Dashboard (:5174)
cd frontend/Admin-DashBoard
npm install && npm run dev
```

---

### Step 5: Run Mobile Applications
```bash
# Shopkeeper Mobile App (Chemist Scanner)
cd frontend/shopkeeper-mobile
npx expo start -c

# Citizen Mobile App (Consumer Scanner)
cd frontend/customer-mobile
npx expo start -c
```
*Scan the QR in terminal with the **Expo Go** app on your phone to launch.*

---

## 🎯 Verification Workflow (Testing the Complete System)

1. **Create & Auto-Mint a Batch**:
   - Open `http://localhost:5173` $\to$ Go to **Create Batch**.
   - Enter medicine details $\to$ Click **Register & Create Batch**.
   - Batch is created and cryptographically signed directly into **`● Minted`** state.
2. **Inspect Scannable 2D QR Code**:
   - Open **QR Serialization Hub** $\to$ View the **`● Live Authenticated QR`** with ES256 digital signature.
3. **Inbound Intake Scan (Chemist App)**:
   - Open **Shopkeeper Mobile App** on physical phone $\to$ Select **Inbound Mode**.
   - Scan the QR on computer screen $\to$ Result: **`Stock Inbound Accepted ✅`** (added to inventory).
4. **Duplicate Intake Protection**:
   - Scan the same pack again $\to$ Result: **`DUPLICATE_INTAKE (409 Conflict) 🚫`**.
5. **Point-of-Sale Dispense**:
   - Switch Chemist app to **Dispense Mode** $\to$ Scan the pack $\to$ Result: **`Sale Confirmed 🛒`** (marked `SOLD` on blockchain).
6. **Consumer Verification**:
   - Scan the pack with **Customer App** $\to$ Result: **`Verified Genuine Medicine (Authenticity Trust Score: 98/100)`**.

---

<div align="center">
  <sub>Built with ❤️ for Smart India Hackathon (SIH 2026) | National Drug Track-and-Trace Infrastructure</sub>
</div>
