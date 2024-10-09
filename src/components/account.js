import React, { useState, useEffect} from 'react'
import { collection, getDocs, doc, updateDoc, setDoc , deleteDoc } from 'firebase/firestore';
import { db} from '../config/firebase-config';
import { useNavigate } from 'react-router-dom';


export const Account = () => {
  const [accounts, setAccounts] = useState([]);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccounts = async () => {
      const accountsCollectionRef = collection(db, "accounts");
      const data = await getDocs(accountsCollectionRef);
      setAccounts(data.docs.map((doc) => ({ ...doc.data(), id: doc.id, Role: doc.data().Role || "" }))); // Set Role to "" if undefined
    };

    fetchAccounts();
  }, []);

  const handleEditClick = (accountId) => {
    setEditingAccountId(accountId);
    const accountData = accounts.find(account => account.id === accountId);
    setSelectedRole(accountData.Role || ""); // Pre-select the current role or ""
  };

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handleConfirmClick = async () => {
    if (editingAccountId) {
      try {
        const accountDocRef = doc(db, "accounts", editingAccountId);
        const accountData = accounts.find(account => account.id === editingAccountId);
        const prevRole = accountData.Role;
        
        // Assign "" if "None" is selected
        const roleToAssign = selectedRole === "None" ? "" : selectedRole; 

        // Only update if the role has actually changed
        if (prevRole !== roleToAssign) {
          await updateDoc(accountDocRef, { Role: selectedRole });
        
          // If switching to a specific role (doctor or nurse)
          if (roleToAssign !== "") {
            const listCollectionRef = collection(db, roleToAssign + "s");
            await setDoc(doc(listCollectionRef, accountData.Userid), { // Use accountData.Userid here
              Gmail: accountData.Gmail, 
              Userid: accountData.Userid,
              ContactDetails: { email: accountData.Gmail, phone: '' }, 
              Experience: 0,
              LicenseNumber: '',
              Name: accountData.Username, 
              Rating: 0,
              Specialization: '',
              WorkingHours: {
                Monday: false,
                Tuesday: false,
                Wednesday: false,
                Thursday: false,
                Friday: false,
                Saturday: false,
                Sunday: false
              },
              StartWorkingHours: '',
              EndWorkingHours: ''
            });
          }

          // If there was a previous role AND the role has changed, delete from that list
          if (prevRole && prevRole !== roleToAssign) { 
            const prevListCollectionRef = collection(db, prevRole + "s");
            await deleteDoc(doc(prevListCollectionRef, accountData.Userid)); // Use accountData.Userid here as well
          }

          setAccounts(accounts.map((account) =>
            account.id === editingAccountId ? { ...account, Role: roleToAssign } : account
          ));
        } // End of if (prevRole !== roleToAssign)

        setEditingAccountId(null);
        setSelectedRole('');
      } catch (error) {
        console.error("Error updating role:", error);
      }
    }
  };

  return (
    <div className="AccountList">
    <h1>Account List</h1>

    {accounts.map((account) => (
      <div key={account.id}>
        <p>User ID: {account.Userid}</p>
        <p>Gmail: {account.Gmail}</p>
        {editingAccountId === account.id ? (
          <>
            <select value={selectedRole} onChange={handleRoleChange}>
              <option value="">None</option> {/* Add "None" option */}
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
            </select>
            <button onClick={handleConfirmClick}>Confirm</button>
          </>
        ) : (
          <>
            <p>Role: {account.Role || "None"}</p> {/* Display "None" if role is empty */}
            <button onClick={() => handleEditClick(account.id)}>Edit</button>
          </>
        )}
      </div>
    ))}
    <button onClick = {() => {navigate("/dashboard")}}>Return to Dashboard</button>
  </div>
);
};
