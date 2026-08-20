import React, { useState, useEffect } from 'react';

export default function ResourceAllocationMediFlowCentral() {
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` };
      
      const invRes = await fetch('/api/inventory', { headers });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }

      if (['Inventory Manager', 'Admin'].includes(userRole)) {
        const reqRes = await fetch('/api/resource-requests', { headers });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequests(reqData);
        }
      } else if (['Doctor', 'Nurse'].includes(userRole)) {
        const reqRes = await fetch('/api/resource-requests/my-requests', { headers });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequests(reqData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole]);

  const handleRequestResource = async (itemId) => {
    const qty = window.prompt("Enter quantity needed:", "1");
    if (!qty || isNaN(qty)) return;

    try {
      const response = await fetch('/api/resource-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          itemRequested: itemId,
          quantity: parseInt(qty),
          urgency: 'Normal'
        })
      });
      if (response.ok) {
        alert("Request sent successfully.");
        fetchData();
      } else {
        alert("Failed to send request.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFulfillRequest = async (reqId) => {
    try {
      const response = await fetch(`/api/resource-requests/${reqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({ status: 'Fulfilled' })
      });
      if (response.ok) {
        alert("Request fulfilled.");
        fetchData();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full">
      {/* Header Actions */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <p className="text-label-md text-primary font-bold uppercase tracking-widest mb-base">Live Inventory Monitor</p>
          <h3 className="font-display-lg text-display-lg text-on-surface">Critical Assets</h3>
        </div>
        <div className="flex gap-sm">
          <button className="px-md py-sm border border-primary text-primary font-label-md rounded-lg hover:bg-primary/5 transition-all flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">download</span> Export Report
          </button>
          {['Inventory Manager', 'Admin'].includes(userRole) && (
            <button className="px-md py-sm bg-primary text-white font-label-md rounded-lg shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">add</span> New Item
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-xl text-center text-on-surface-variant">Loading inventory data...</div>
      ) : (
        <div className="bento-grid grid grid-cols-12 gap-lg animate-fade-in animation-delay-100">
          
          {/* Detailed Inventory Table */}
          <div className="col-span-12 lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col">
            <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-bright/50">
              <h5 className="font-headline-md text-on-surface">Detailed Resource Log</h5>
              <div className="flex gap-xs">
                <button className="p-2 rounded hover:bg-surface-container-high transition-all">
                  <span className="material-symbols-outlined text-[20px]">sync</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-lg py-sm font-label-md text-on-surface-variant uppercase tracking-wider">Item Name</th>
                    <th className="px-lg py-sm font-label-md text-on-surface-variant uppercase tracking-wider">Category</th>
                    <th className="px-lg py-sm font-label-md text-on-surface-variant uppercase tracking-wider">Quantity</th>
                    <th className="px-lg py-sm font-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-lg py-sm font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {inventory.length > 0 ? inventory.map(item => (
                    <tr key={item._id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-lg py-md font-body-md font-bold text-on-surface">{item.itemName}</td>
                      <td className="px-lg py-md text-on-surface-variant">{item.category}</td>
                      <td className="px-lg py-md font-data-mono">{item.quantity} {item.unit}</td>
                      <td className="px-lg py-md">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                          item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
                          'bg-error-container text-error'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-lg py-md text-right">
                        {['Doctor', 'Nurse'].includes(userRole) && item.quantity > 0 && (
                          <button 
                            onClick={() => handleRequestResource(item._id)}
                            className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1 rounded hover:bg-primary/20"
                          >
                            REQUEST
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-lg py-xl text-center text-on-surface-variant">No inventory items found. Run DB Seed or add manually.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar Info Cluster */}
          <div className="col-span-12 lg:col-span-4 space-y-lg">
            {/* Requests Feed */}
            <div className="glass-card rounded-xl p-lg h-full overflow-y-auto max-h-[600px]">
              <h6 className="font-label-md text-primary font-bold uppercase mb-md">Resource Requests</h6>
              
              <div className="space-y-md">
                {requests.length > 0 ? requests.map(req => (
                  <div key={req._id} className="flex gap-md bg-surface-container-low p-md rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${req.status === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-body-sm text-on-surface">
                        <span className="font-bold">{req.itemRequested?.itemName || 'Unknown Item'}</span> ({req.quantity})
                      </p>
                      <p className="text-[10px] text-on-surface-variant uppercase mt-xs mb-sm">
                        {new Date(req.createdAt).toLocaleTimeString()} • {req.requestedBy?.name || 'Unknown'}
                      </p>
                      
                      {req.status === 'Pending' && ['Inventory Manager', 'Admin'].includes(userRole) && (
                        <button 
                          onClick={() => handleFulfillRequest(req._id)}
                          className="w-full bg-primary text-white text-[10px] font-bold py-1 rounded"
                        >
                          FULFILL REQUEST
                        </button>
                      )}
                      {req.status === 'Fulfilled' && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">COMPLETED</span>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-body-sm text-on-surface-variant text-center py-lg">No active requests.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
