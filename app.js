document.addEventListener('DOMContentLoaded', (event) => {

    // ================== DATE & TIME ==================
    function updateDateTime() {
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const months = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
            "Agustus", "September", "Oktober", "November", "Desember",
        ];
        // Menggunakan waktu lokal Jakarta
        const now = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
        );
        const dayName = days[now.getDay()];
        const date = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const hh = now.getHours().toString().padStart(2, "0");
        const mm = now.getMinutes().toString().padStart(2, "0");
        const ss = now.getSeconds().toString().padStart(2, "0");
        
        const datetimeElement = document.getElementById("datetime");
        if (datetimeElement) {
            datetimeElement.textContent = `${dayName}, ${date} ${month} ${year} (${hh}:${mm}:${ss} WIB)`;
        }
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // ================== SHA-256 ==================
    async function sha256(msg) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
        return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    // ================== NAVIGATION ==================
    function showPage(pageId) {
        // Menggunakan selektor baru: .sidebar-nav button
        document
            .querySelectorAll(".page")
            .forEach((p) => p.classList.remove("active"));
        document
            .querySelectorAll(".sidebar-nav button") 
            .forEach((b) => b.classList.remove("active"));
        
        const pageElement = document.getElementById(pageId);
        if (pageElement) pageElement.classList.add("active");
        
        const tabElement = document.getElementById("tab-" + pageId.split("-")[1]);
        if (tabElement) tabElement.classList.add("active");
    }
    
    ["home", "about", "hash", "block", "chain", "ecc", "consensus"].forEach((p) => {
        const t = document.getElementById("tab-" + p);
        if (t) t.onclick = () => showPage("page-" + p);
    });
    
    // Tambahkan listener untuk contoh hash
    document.querySelectorAll('.example-btn').forEach(button => {
        button.addEventListener('click', () => {
            const text = button.getAttribute('data-text');
            const hashInput = document.getElementById('hash-input');
            if(hashInput) {
                hashInput.value = text;
                hashInput.dispatchEvent(new Event('input')); 
            }
        });
    });
    // Tambahkan listener untuk copy hash (jika ada)
    const copyHashButton = document.getElementById('copyHash');
    if (copyHashButton) {
        copyHashButton.addEventListener('click', () => {
            const hashOutput = document.getElementById('hash-output').textContent;
            navigator.clipboard.writeText(hashOutput).then(() => {
                alert('Hash disalin!');
            });
        });
    }


    // ================== HASH PAGE ==================
    const hashInput = document.getElementById("hash-input");
    if (hashInput) {
        hashInput.addEventListener("input", async (e) => {
            const hashOutput = document.getElementById("hash-output");
            if (hashOutput) {
                hashOutput.textContent = await sha256(
                    e.target.value
                );
            }
        });
    }

    // ================== BLOCK PAGE ==================
    const blockData = document.getElementById("block-data");
    const blockNonce = document.getElementById("block-nonce");
    const blockHash = document.getElementById("block-hash");
    const blockTimestamp = document.getElementById("block-timestamp");
    const speedControl = document.getElementById("speed-control");
    const btnMine = document.getElementById("btn-mine");
    
    if (blockNonce) {
        blockNonce.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, "");
            updateBlockHash();
        });
    }
    
    if (blockData) {
        blockData.addEventListener("input", updateBlockHash);
    }

    async function updateBlockHash() {
        const data = blockData ? blockData.value : "";
        const nonce = blockNonce ? blockNonce.value || "0" : "0";
        if (blockHash) {
            blockHash.textContent = await sha256(data + nonce);
        }
    }

    if (btnMine) {
        btnMine.addEventListener("click", async () => {
            const data = blockData.value;
            const speedMultiplier = parseInt(speedControl.value) || 1;
            const baseBatch = 1000;
            const batchSize = baseBatch * speedMultiplier;
            const difficulty = "0000";
            const status = document.getElementById("mining-status");
            const timestamp = new Date().toLocaleString("en-US", {
                timeZone: "Asia/Jakarta",
            });
            blockTimestamp.value = timestamp;
            blockHash.textContent = "";
            blockNonce.value = "0";
            let nonce = 0;
            if (status) status.textContent = "Mining...";
            async function mineStep() {
                const promises = [];
                for (let i = 0; i < batchSize; i++) {
                    promises.push(sha256(data + timestamp + (nonce + i)));
                }
                const results = await Promise.all(promises);
                for (let i = 0; i < results.length; i++) {
                    const h = results[i];
                    if (h.startsWith(difficulty)) {
                        blockNonce.value = nonce + i;
                        blockHash.textContent = h;
                        if (status)
                            status.textContent = `Mining selesai (Nonce=${nonce + i})`;
                        return;
                    }
                }
                nonce += batchSize;
                blockNonce.value = nonce;
                if (status) status.textContent = `Mining... Nonce=${nonce}`;
                setTimeout(mineStep, 0);
            }
            mineStep();
        });
    }

    // ================== BLOCKCHAIN PAGE ==================
    const ZERO_HASH = "0".repeat(64);
    let blocks = [];
    const chainDiv = document.getElementById("blockchain");

    function renderChain() {
        if (!chainDiv) return;

        chainDiv.innerHTML = "";
        blocks.forEach((blk, i) => {
            const div = document.createElement("div");
            div.className = "chain-block";
            div.innerHTML = `
        <h3>Block #${blk.index}</h3>
        <label>Previous Hash:</label><div class="output-v2">${blk.previousHash}</div>
        <label>Data:</label><textarea rows="2" onchange="onChainDataChange(${i},this.value)">${blk.data}</textarea>
        <button onclick="mineChainBlock(${i})" class="button-primary" style="padding: 8px 15px; margin-top: 5px;">Mine</button>
        <div id="status-${i}" class="status" style="font-size: 0.8em; margin-top: 5px; color: var(--success);"></div>
        <label>Timestamp:</label><div class="output-v2" id="timestamp-${i}">${blk.timestamp}</div>
        <label>Nonce:</label><div class="output-v2" id="nonce-${i}">${blk.nonce}</div>
        <label>Hash:</label><div class="output-v2 hash-output-v2" id="hash-${i}">${blk.hash}</div>`;
            chainDiv.appendChild(div);
        });
        
        // Update stats
        const blockCount = document.getElementById('blockCount');
        if(blockCount) blockCount.textContent = blocks.length;
        const chainLength = document.getElementById('chainLength');
        if(chainLength) chainLength.textContent = blocks.length - 1; // Genesi: 0
    }
    
    function addChainBlock() {
        const idx = blocks.length;
        const prev = idx ? blocks[idx - 1].hash : ZERO_HASH;
        const blk = {
            index: idx,
            data: "",
            previousHash: prev,
            timestamp: "",
            nonce: 0,
            hash: "",
        };
        blocks.push(blk);
        renderChain();
    }
    
    window.onChainDataChange = function (i, val) {
        blocks[i].data = val;
        blocks[i].nonce = 0;
        blocks[i].timestamp = "";
        blocks[i].hash = "";
        for (let j = i + 1; j < blocks.length; j++) {
            blocks[j].previousHash = blocks[j - 1].hash;
            blocks[j].nonce = 0;
            blocks[j].timestamp = "";
            blocks[j].hash = "";
        }
        renderChain();
    };
    
    window.mineChainBlock = function (i) {
        const blk = blocks[i];
        const prev = blk.previousHash;
        const data = blk.data;
        const difficulty = "0000";
        const batchSize = 1000 * 50;
        blk.nonce = 0;
        blk.timestamp = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
        });
        const t0 = performance.now();
        const status = document.getElementById(`status-${i}`);
        const ndiv = document.getElementById(`nonce-${i}`);
        const hdiv = document.getElementById(`hash-${i}`);
        const tdiv = document.getElementById(`timestamp-${i}`);
        if (status) status.textContent = "Proses mining...";
        
        async function step() {
            const promises = [];
            for (let j = 0; j < batchSize; j++)
                promises.push(sha256(prev + data + blk.timestamp + (blk.nonce + j)));
            const results = await Promise.all(promises);
            for (let j = 0; j < results.length; j++) {
                const h = results[j];
                if (h.startsWith(difficulty)) {
                    blk.nonce += j;
                    blk.hash = h;
                    if(ndiv) ndiv.textContent = blk.nonce;
                    if(hdiv) hdiv.textContent = h;
                    if(tdiv) tdiv.textContent = blk.timestamp;
                    const dur = ((performance.now() - t0) / 1000).toFixed(3);
                    if (status) status.textContent = `Mining selesai (${dur}s)`;
                    return;
                }
            }
            blk.nonce += batchSize;
            if(ndiv) ndiv.textContent = blk.nonce;
            setTimeout(step, 0);
        }
        step();
    };
    
    const btnAddBlock = document.getElementById("btn-add-block");
    if (btnAddBlock) btnAddBlock.onclick = addChainBlock;
    
    const btnClearChain = document.getElementById("btn-clear-chain");
    if (btnClearChain) btnClearChain.onclick = () => {
        blocks = [];
        addChainBlock();
    };
    
    const btnValidateChain = document.getElementById("btn-validate-chain");
    if (btnValidateChain) btnValidateChain.onclick = async () => {
        let allValid = true;
        for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            const prevHash = i === 0 ? ZERO_HASH : blocks[i - 1].hash;
            const recomputedHash = await sha256(blk.previousHash + blk.data + blk.timestamp + blk.nonce);
            
            const isBlockValid = blk.hash.startsWith('0000') && recomputedHash === blk.hash && blk.previousHash === prevHash;
            
            const blockElement = chainDiv.children[i];
            if (blockElement) {
                if (isBlockValid) {
                    blockElement.classList.remove('invalid');
                } else {
                    blockElement.classList.add('invalid');
                    allValid = false;
                }
            }
        }
        
        const validationResult = document.getElementById('chain-validation');
        if(validationResult) {
            validationResult.textContent = allValid ? 'Blockchain VALID! Semua blok dan hash terhubung dengan benar.' : 'Blockchain TIDAK VALID! Ada blok yang rusak atau tidak terhubung.';
            validationResult.style.color = allValid ? 'var(--success)' : 'var(--danger)';
        }
        
        const validBlocks = document.getElementById('validBlocks');
        if(validBlocks) validBlocks.textContent = allValid ? blocks.length : 'Error';
    };
    
    addChainBlock();


    // ================== ECC DIGITAL SIGNATURE ==================
    const ec = new elliptic.ec("secp256k1");
    const eccPrivate = document.getElementById("ecc-private");
    const eccPublic = document.getElementById("ecc-public");
    const eccMessage = document.getElementById("ecc-message");
    const eccSignature = document.getElementById("ecc-signature");
    const eccVerifyResult = document.getElementById("ecc-verify-result");
    
    function randomPrivateHex() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return Array.from(arr)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    function normHex(h) {
        if (!h) return "";
        return h.toLowerCase().replace(/^0x/, "");
    }
    
    const btnGenerateKey = document.getElementById("btn-generate-key");
    if (btnGenerateKey) {
        btnGenerateKey.onclick = () => {
            const priv = randomPrivateHex();
            const key = ec.keyFromPrivate(priv, "hex");
            const pub =
                "04" +
                key.getPublic().getX().toString("hex").padStart(64, "0") +
                key.getPublic().getY().toString("hex").padStart(64, "0");
            
            if (eccPrivate) eccPrivate.value = priv;
            if (eccPublic) eccPublic.value = pub;
            if (eccSignature) eccSignature.value = "";
            if (eccVerifyResult) eccVerifyResult.textContent = "";
        };
    }

    const btnSign = document.getElementById("btn-sign");
    if (btnSign) {
        btnSign.onclick = async () => {
            const msg = eccMessage ? eccMessage.value : "";
            if (!msg) {
                alert("Isi pesan!");
                return;
            }
            const priv = eccPrivate ? normHex(eccPrivate.value.trim()) : "";
            if (!priv) {
                alert("Private key kosong!");
                return;
            }
            const hash = await sha256(msg);
            try {
                const sig = ec
                    .keyFromPrivate(priv, "hex")
                    .sign(hash, { canonical: true })
                    .toDER("hex");
                
                if (eccSignature) eccSignature.value = sig;
                if (eccVerifyResult) eccVerifyResult.textContent = "";
            } catch (e) {
                alert("Private Key tidak valid. Silakan Generate Key Pair baru.");
            }
        };
    }

    const btnVerify = document.getElementById("btn-verify");
    if (btnVerify) {
        btnVerify.onclick = async () => {
            try {
                const msg = eccMessage ? eccMessage.value : "";
                const sig = eccSignature ? normHex(eccSignature.value.trim()) : "";
                const pub = eccPublic ? normHex(eccPublic.value.trim()) : "";
                
                if (!msg || !sig || !pub) {
                    alert("Lengkapi semua field!");
                    return;
                }
                const key = ec.keyFromPublic(pub, "hex");
                const valid = key.verify(await sha256(msg), sig);
                
                if (eccVerifyResult) {
                    eccVerifyResult.textContent = valid
                        ? "Signature VALID!"
                        : "Signature TIDAK valid!";
                    eccVerifyResult.style.color = valid ? 'var(--success)' : 'var(--danger)';
                }
            } catch (e) {
                if (eccVerifyResult) eccVerifyResult.textContent = "Error verifikasi: Public key atau Signature tidak valid.";
                if (eccVerifyResult) eccVerifyResult.style.color = 'var(--danger)';
            }
        };
    }


    // ================== KONSENSUS PAGE ==================
    const ZERO = "0".repeat(64);
    let balances = { A: 100, B: 100, C: 100 };
    let txPool = [];
    let chainsConsensus = { A: [], B: [], C: [] };

    function updateBalancesDOM() {
        ["A", "B", "C"].forEach((u) => {
            const el = document.getElementById("saldo-" + u);
            if (el) el.textContent = balances[u];
        });
    }
    function parseTx(line) {
        const m = line.match(/^([A-C])\s*->\s*([A-C])\s*:\s*(\d+)$/);
        if (!m) return null;
        return { from: m[1], to: m[2], amt: parseInt(m[3]) };
    }

    // ======== Mining Helper ========
    async function shaMine(prev, data, timestamp) {
        const diff = "000";
        const base = 1000;
        const batch = base * 50;
        return new Promise((resolve) => {
            let nonce = 0;
            async function loop() {
                const promises = [];
                for (let i = 0; i < batch; i++)
                    promises.push(sha256(prev + data + timestamp + (nonce + i)));
                const results = await Promise.all(promises);
                for (let i = 0; i < results.length; i++) {
                    const h = results[i];
                    if (h.startsWith(diff)) {
                        resolve({ nonce: nonce + i, hash: h });
                        return;
                    }
                }
                nonce += batch;
                setTimeout(loop, 0);
            }
            loop();
        });
    }

    // ======== Genesis dengan mining ========
    async function createGenesisConsensus() {
        const diff = "000";
        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        for (let u of ["A", "B", "C"]) {
            let nonce = 0;
            let found = "";
            while (true) {
                const h = await sha256(ZERO + "Genesis" + ts + nonce);
                if (h.startsWith(diff)) {
                    found = h;
                    break;
                }
                nonce++;
            }
            chainsConsensus[u] = [
                {
                    index: 0,
                    prev: ZERO,
                    data: "Genesis Block: 100 coins",
                    timestamp: ts,
                    nonce,
                    hash: found,
                    invalid: false,
                },
            ];
        }
        renderConsensusChains();
        updateBalancesDOM();
    }
    createGenesisConsensus();

    // ======== Render Konsensus Chain ========
    function renderConsensusChains() {
        ["A", "B", "C"].forEach((u) => {
            const cont = document.getElementById("chain-" + u);
            if (!cont) return;
            
            cont.innerHTML = "";
            chainsConsensus[u].forEach((blk, i) => {
                const d = document.createElement("div");
                d.className = "chain-block" + (blk.invalid ? " invalid" : "");
                d.innerHTML = `
            <div class="small" style="color: var(--primary);"><strong>Block #${blk.index}</strong></div>
            <div class="small">Prev:</div><input class="small" value="${blk.prev}" readonly>
            <div class="small">Data:</div><textarea class="data" rows="3">${blk.data}</textarea>
            <div class="small">Timestamp:</div><input class="small" value="${blk.timestamp}" readonly>
            <div class="small">Nonce:</div><input class="small" value="${blk.nonce}" readonly>
            <div class="small">Hash:</div><input class="small" value="${blk.hash}" readonly>`;

                const ta = d.querySelector("textarea.data");
                if (ta) {
                    ta.addEventListener("input", (e) => {
                        chainsConsensus[u][i].data = e.target.value;
                    });
                }
                cont.appendChild(d);
            });
        });
    }
    
    // ======== Listener untuk Tab Konsensus (Node A, B, C) ========
    document.querySelectorAll('.node-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const node = tab.getAttribute('data-node');
            
            document.querySelectorAll('.node-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.node-chain').forEach(c => c.style.display = 'none');
            
            tab.classList.add('active');
            const chainElement = document.getElementById(`node-${node}-chain`);
            if (chainElement) chainElement.style.display = 'block';
        });
    });


    // ======== Kirim Transaksi ========
    ["A", "B", "C"].forEach((u) => {
        const sendButton = document.getElementById("send-" + u);
        if (sendButton) {
            sendButton.onclick = () => {
                const amountInput = document.getElementById("amount-" + u);
                const receiverSelect = document.getElementById("receiver-" + u);
                const mempoolTextarea = document.getElementById("mempool");
                
                if (!amountInput || !receiverSelect || !mempoolTextarea) return;

                const amt = parseInt(amountInput.value);
                const to = receiverSelect.value;
                
                if (amt <= 0) {
                    alert("Jumlah > 0");
                    return;
                }
                if (balances[u] < amt) {
                    alert("Saldo tidak cukup");
                    return;
                }
                const tx = `${u} -> ${to} : ${amt}`;
                txPool.push(tx);
                mempoolTextarea.value = txPool.join("\n");
                
                const txCount = document.getElementById('txCount');
                if(txCount) txCount.textContent = txPool.length + " transaksi";
            };
        }
    });

    // ======== Mine Semua Transaksi ========
    const btnMineAll = document.getElementById("btn-mine-all");
    if (btnMineAll) {
        btnMineAll.onclick = async () => {
            if (txPool.length === 0) {
                alert("Tidak ada transaksi.");
                return;
            }
            const parsed = [];
            for (const t of txPool) {
                const tx = parseTx(t);
                if (!tx) {
                    alert("Format salah: " + t);
                    return;
                }
                parsed.push(tx);
            }
            const tmp = { ...balances };
            for (const tx of parsed) {
                if (tmp[tx.from] < tx.amt) {
                    alert("Saldo " + tx.from + " tidak cukup.");
                    return;
                }
                tmp[tx.from] -= tx.amt;
                tmp[tx.to] += tx.amt;
            }
            const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
            const data = txPool.join(" | ");
            const mining = ["A", "B", "C"].map(async (u) => {
                const prev = chainsConsensus[u].at(-1).hash;
                const r = await shaMine(prev, data, ts);
                chainsConsensus[u].push({
                    index: chainsConsensus[u].length,
                    prev,
                    data,
                    timestamp: ts,
                    nonce: r.nonce,
                    hash: r.hash,
                    invalid: false,
                });
            });
            await Promise.all(mining);
            balances = tmp;
            updateBalancesDOM();
            txPool = [];
            
            const mempoolTextarea = document.getElementById("mempool");
            if (mempoolTextarea) mempoolTextarea.value = "";
            const txCount = document.getElementById('txCount');
            if(txCount) txCount.textContent = "0 transaksi";

            renderConsensusChains();
            alert("Mining selesai (50× lebih cepat).");
        };
    }

    // ======== Tombol VERIFY Konsensus ========
    const btnVerifyConsensus = document.getElementById("btn-verify-consensus");
    if (btnVerifyConsensus) {
        btnVerifyConsensus.onclick = async () => {
            try {
                let anyInvalid = false;
                for (const u of ["A", "B", "C"]) {
                    for (let i = 1; i < chainsConsensus[u].length; i++) {
                        const blk = chainsConsensus[u][i];
                        const expectedPrev = chainsConsensus[u][i - 1].hash;
                        const recomputed = await sha256(
                            blk.prev + blk.data + blk.timestamp + blk.nonce
                        );
                        
                        // Periksa hash dan previous hash
                        const isInvalid = recomputed !== blk.hash || blk.prev !== expectedPrev;
                        blk.invalid = isInvalid;
                        if(isInvalid) anyInvalid = true;
                    }
                }
                renderConsensusChains();
                alert(`Verifikasi selesai. ${anyInvalid ? 'Ada' : 'Tidak ada'} blok yang berubah.`);
            } catch (err) {
                console.error("Error saat verifikasi Konsensus:", err);
                alert("Terjadi kesalahan saat verifikasi Konsensus. Cek console.");
            }
        };
    }

    // ======== Tombol CONSENSUS ========
    const btnConsensus = document.getElementById("btn-consensus");
    if (btnConsensus) {
        btnConsensus.onclick = async () => {
            try {
                const users = ["A", "B", "C"];
                const maxLen = Math.max(...users.map((u) => chainsConsensus[u].length));

                for (let i = 0; i < maxLen; i++) {
                    const candidates = users
                        .map((u) => chainsConsensus[u][i])
                        .filter((b) => b && !b.invalid);

                    if (candidates.length === 0) continue; 

                    const freq = {};
                    let majority = candidates[0];
                    for (const blk of candidates) {
                        const key = blk.hash + blk.data;
                        freq[key] = (freq[key] || 0) + 1;
                        if (freq[key] > (freq[majority.hash + majority.data] || 0)) {
                            majority = blk;
                        }
                    }

                    for (const u of users) {
                        const chain = chainsConsensus[u];
                        if (!chain[i]) continue;

                        if (chain[i].invalid || (chain[i].hash !== majority.hash && i > 0)) {
                            chain[i] = { ...majority, invalid: false };
                        }

                        if (i > 0 && chain[i]) {
                            chain[i].prev = chain[i - 1].hash;
                        }
                    }
                }

                renderConsensusChains();
                alert("Konsensus selesai: blok disinkronkan ke mayoritas yang valid.");
            } catch (e) {
                console.error(e);
                alert("Terjadi kesalahan saat konsensus.");
            }
        };
    }
});