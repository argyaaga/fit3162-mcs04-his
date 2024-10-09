import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import "../App.css";
import MedicalRecord from "../images/medicine-logo.svg";
import "../styles/sidebar.css";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [user, setUser] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const accountsCollectionRef = collection(db, "accounts");
  const doctorsCollectionRef = collection(db, "doctors");
  const nursesCollectionRef = collection(db, "nurses");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setUserRole(currentUser ? "user" : null);

      const fetchUserRole = async () => {
        if (currentUser) {
          let userEmail = currentUser.email;
          if (userEmail) {
            let q = query(
              accountsCollectionRef,
              where("Gmail", "==", userEmail)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              setUserRole(userData.Role);

              // Fetch additional information based on role
              if (userData.Role === "doctor") {
                const doctorDoc = await getDoc(
                  doc(db, "doctors", userData.Userid)
                );
                setAdditionalInfo(doctorDoc.data());

                const doctorsSnapshot = await getDocs(doctorsCollectionRef);
                const doctorsList = doctorsSnapshot.docs.map((doc) =>
                  doc.data()
                );
                setDoctors(doctorsList);
              } else if (userData.Role === "nurse") {
                const nurseDoc = await getDoc(
                  doc(db, "nurses", userData.Userid)
                );
                setAdditionalInfo(nurseDoc.data());

                const nursesSnapshot = await getDocs(nursesCollectionRef);
                const nursesList = nursesSnapshot.docs.map((doc) => doc.data());
                setNurses(nursesList);
              }
            } else {
              setUserRole(null);
            }
          }
        } else {
          setUserRole(null);
        }
      };

      fetchUserRole();
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`} style={{ zIndex: 3 }}>
      <button className="close-btn" onClick={toggleSidebar}>
        ×
      </button>
      <div className="account-header">
        <h2>Account Information</h2>
        <img src={MedicalRecord} alt="Medical logo" className="medical-logos" />
      </div>
      <div className="account-info">
        <div className="user-details">
          <p>
            <strong>Name:</strong> {user.displayName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {userRole}
          </p>
        </div>
      </div>

      {userRole === "doctor" && doctors.length > 0 && (
        <div className="role-details">
          <h2>Doctor Details</h2>
          {doctors
            .filter((doctor) => doctor.Gmail === user.email)
            .map((doctor, index) => (
              <div key={index}>
                <p>
                  <strong>Phone:</strong> {doctor.phone}
                </p>
                <p>
                  <strong>Experience:</strong> {doctor.Experience}
                </p>
                <p>
                  <strong>License Number:</strong> {doctor.LicenseNumber}
                </p>
                <p>
                  <strong>Specialization:</strong> {doctor.Specialization}
                </p>
                <p>
                  <strong>Rating:</strong> {doctor.Rating}
                </p>
                <h4>Working Hours</h4>
                {Object.keys(doctor.WorkingHours).map((day) => (
                  <p key={day}>
                    {day}: {doctor.WorkingHours[day] ? "Yes" : "No"}
                  </p>
                ))}
              </div>
            ))}
        </div>
      )}

      {userRole === "nurse" && nurses.length > 0 && (
        <div className="role-details">
          <h2>Nurse Details</h2>
          {nurses
            .filter((nurse) => nurse.Gmail === user.email)
            .map((nurse, index) => (
              <div key={index}>
                <p>
                  <strong>Phone:</strong> {nurse.ContactDetails.phone}
                </p>
                <p>
                  <strong>Experience:</strong> {nurse.Experience}
                </p>
                <p>
                  <strong>License Number:</strong> {nurse.LicenseNumber}
                </p>
                <p>
                  <strong>Specialization:</strong> {nurse.Specialization}
                </p>
                <p>
                  <strong>Rating:</strong> {nurse.Rating}
                </p>
                <h4>Working Hours</h4>
                {Object.keys(nurse.WorkingHours).map((day) => (
                  <p key={day}>
                    {day}: {nurse.WorkingHours[day] ? "Yes" : "No"}
                  </p>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
