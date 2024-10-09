import './App.css';
import { Auth } from './components/auth';
import { Register } from './components/signup';
import { ErrorPageFound } from './components/ErrorPage';
import { Dashboard } from './components/dashboard';
import { Patient } from './components/patient';
import { Account } from './components/account';
import { Waiting } from './components/waiting';
import { Medicine } from './components/medicine'; 
import { Appointment } from './components/appointment';
import { MedicalRecord } from './components/MedicalRecord';
import { Prescriptions } from './components/prescriptions';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase-config'; // Import your Firebase configuration
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TextTranscribe } from './components/TextTranscribe';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [userRole, setUserRole] = useState(null); // Add state to store user role
  const accountsCollectionRef = collection(db, "accounts"); // Reference to your 'accounts' collection

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Fetch user role from Firestore when user is authenticated
        const fetchUserRole = async () => {
          let userEmail = currentUser.email;
          let q = query(accountsCollectionRef, where("Gmail", "==", userEmail)); // Assuming 'Gmail' is the field for email in your 'accounts' collection
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUserRole(userData.Role); 
          }
        };
        fetchUserRole();
      } else {
        setUserRole(null);
      }
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/signUp" element={<Register />} />
        <Route path="/" element={<Auth setIsAuth={setIsAuth} />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Dashboard /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/account" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Account /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/appointment" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Appointment /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/patients" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Patient /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/medicine" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Medicine /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/medicalrecord" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <MedicalRecord /> 
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/prescription" 
          element={
            <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
              <Prescriptions /> 
            </ProtectedRoute>
          } 
        />

        <Route path="/waiting" element={<Waiting />} /> 
        <Route path="/temptest" element={<TextTranscribe />} />
        <Route path="*" element={<ErrorPageFound />} />
      </Routes>
    </Router>
  );
}

export default App;

/*
Create param in redirect
<Route path = "/profile/:username" element={<Profile />} />

In the profile components
import {userNavigate, useParams } from "react-router-dom";
let { username } = useParams();

<div>
  THIS IS THE PROFILE PAGE FOR {username}! use id instead of username.
</div>

There is also link where a header with different link https://www.youtube.com/watch?v=UjHT_NKR_gU
*/