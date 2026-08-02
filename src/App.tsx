import { useState, useEffect } from 'react'
import { createAccount } from 'genlayer-js'
import { client, CONTRACT_ADDRESS } from './lib/genlayer'
import { Brain, ShieldCheck, RefreshCw, PlusCircle, Search } from 'lucide-react'
import './index.css'

function App() {
  const [account, setAccount] = useState<any>(null)
  const [statement, setStatement] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [reqIdInput, setReqIdInput] = useState('')
  
  // Local state for tracking requests we've made
  const [trackedIds, setTrackedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('gentruth_ids')
    return saved ? JSON.parse(saved) : []
  })
  const [requests, setRequests] = useState<Record<string, any>>({})
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resolvingIds, setResolvingIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Generate a random account for testing GenVM
    setAccount(createAccount())
  }, [])

  useEffect(() => {
    localStorage.setItem('gentruth_ids', JSON.stringify(trackedIds))
    fetchAllRequests()
  }, [trackedIds])

  const fetchAllRequests = async () => {
    const newReqs: Record<string, any> = {}
    for (const id of trackedIds) {
      try {
        const res = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_truth',
          args: [id]
        })
        const dataStr = typeof res === 'string' ? res : (res as any).result
        if (dataStr && dataStr !== "NOT_FOUND") {
          newReqs[id] = JSON.parse(dataStr)
        }
      } catch (e) {
        console.error("Error fetching request", id, e)
      }
    }
    setRequests(newReqs)
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!reqIdInput || !statement || !sourceUrl) {
      setErrorMsg("Please fill all fields")
      return
    }

    if (trackedIds.includes(reqIdInput)) {
      setErrorMsg("You are already tracking this ID. Use a new ID.")
      return
    }

    setLoading(true)
    try {
      await client.writeContract({
        account,
        address: CONTRACT_ADDRESS,
        functionName: 'request_truth',
        args: [reqIdInput, statement, [sourceUrl]]
      })
      
      setSuccessMsg(`✅ Request ${reqIdInput} submitted to Blockchain!`)
      setTrackedIds(prev => [...prev, reqIdInput])
      setReqIdInput('')
      setStatement('')
      setSourceUrl('')
    } catch (err: any) {
      setErrorMsg("Error: " + err.message)
    }
    setLoading(false)
  }

  const handleResolve = async (id: string) => {
    setResolvingIds(prev => ({...prev, [id]: true}))
    
    try {
      await client.writeContract({
        account,
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_truth',
        args: [id]
      })
      
      // Poll for result
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await fetchAllRequests();
        
        // Check if it's no longer PENDING (we look at the local state which was just updated)
        // Actually, let's fetch it directly to be sure
        const res = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_truth',
          args: [id]
        })
        const dataStr = typeof res === 'string' ? res : (res as any).result
        if (dataStr && dataStr !== "NOT_FOUND") {
          const req = JSON.parse(dataStr)
          if (req.status !== 'PENDING') {
            clearInterval(interval)
            setResolvingIds(prev => ({...prev, [id]: false}))
            setRequests(prev => ({...prev, [id]: req}))
          }
        }
        
        if (attempts > 30) {
          clearInterval(interval)
          setResolvingIds(prev => ({...prev, [id]: false}))
        }
      }, 2000)
      
    } catch (err: any) {
      alert("Error triggering AI: " + err.message)
      setResolvingIds(prev => ({...prev, [id]: false}))
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo-text">
          <ShieldCheck size={40} color="#38bdf8" />
          GenTruth Protocol
        </h1>
        <p className="subtitle">The Universal AI Fact-Checking Oracle for Smart Contracts</p>
        {account && <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '10px'}}>Connected Test Wallet: {account.address.substring(0,8)}...</div>}
      </header>

      <div className="main-grid">
        <div className="glass-panel">
          <h2 className="panel-title">
            <PlusCircle size={20} />
            Submit Verification Request
          </h2>
          
          <form onSubmit={handleCreateRequest}>
            <div className="form-group">
              <label>Custom Request ID (e.g. req-001)</label>
              <input 
                type="text" 
                className="form-input" 
                value={reqIdInput} 
                onChange={e => setReqIdInput(e.target.value)} 
                placeholder="Unique ID for this request..."
              />
            </div>

            <div className="form-group">
              <label>Statement to Verify</label>
              <textarea 
                className="form-input" 
                value={statement} 
                onChange={e => setStatement(e.target.value)} 
                rows={3}
                placeholder="e.g. 'SpaceX successfully landed the Starship rocket today.'"
              />
            </div>

            <div className="form-group">
              <label>Source Evidence URL</label>
              <input 
                type="url" 
                className="form-input" 
                value={sourceUrl} 
                onChange={e => setSourceUrl(e.target.value)} 
                placeholder="https://..."
              />
            </div>

            <div className="example-tags">
              <button type="button" className="btn-secondary" onClick={() => {
                setReqIdInput('req-' + Math.floor(Math.random()*10000));
                setStatement('Argentina won the 2022 FIFA World Cup Final.');
                setSourceUrl('https://en.wikipedia.org/wiki/2022_FIFA_World_Cup_final');
              }}>Test: Wikipedia</button>
              
              <button type="button" className="btn-secondary" onClick={() => {
                setReqIdInput('req-' + Math.floor(Math.random()*10000));
                setStatement('Ethereum transitioned to Proof of Stake in 2022.');
                setSourceUrl('https://ethereum.org/en/upgrades/merge/');
              }}>Test: Web3 News</button>
            </div>

            {errorMsg && <div style={{color: 'var(--error)', marginTop: '15px', fontSize: '0.9rem'}}>{errorMsg}</div>}
            {successMsg && <div style={{color: 'var(--success)', marginTop: '15px', fontSize: '0.9rem'}}>{successMsg}</div>}

            <button type="submit" className="btn-primary" style={{marginTop: '20px'}} disabled={loading}>
              {loading ? <RefreshCw className="loader" size={18} /> : <ShieldCheck size={18} />}
              {loading ? 'Submitting to Blockchain...' : 'Request AI Verification'}
            </button>
          </form>
        </div>

        <div className="glass-panel">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px'}}>
            <h2 className="panel-title" style={{border: 'none', padding: 0, margin: 0}}>
              <Search size={20} />
              Oracle Ledger
            </h2>
            <button className="btn-secondary" onClick={fetchAllRequests} style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {trackedIds.length === 0 ? (
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0'}}>
                No requests found. Submit a statement to test the GenTruth Oracle.
              </div>
            ) : (
              trackedIds.map(id => {
                const req = requests[id]
                if (!req) return null
                
                const isResolving = resolvingIds[id]
                const statusClass = `status-${req.status}`

                return (
                  <div key={id} className="request-card">
                    <div className="req-header">
                      <span className="req-id">#{id}</span>
                      <span className={`status-badge ${statusClass}`}>{req.status}</span>
                    </div>
                    
                    <div className="req-statement">"{req.statement}"</div>
                    
                    <div style={{marginBottom: '10px'}}>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px'}}>Evidence Source:</div>
                      {req.sources.map((src: string, idx: number) => (
                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="source-link">🔗 {src}</a>
                      ))}
                    </div>

                    {req.status === 'PENDING' && (
                      <button 
                        className="btn-resolve" 
                        onClick={() => handleResolve(id)}
                        disabled={isResolving}
                      >
                        {isResolving ? (
                          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <RefreshCw className="loader" size={16} /> AI Consensus in progress...
                          </span>
                        ) : (
                          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <Brain size={16} /> Trigger AI Oracle
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )
              }).reverse()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
