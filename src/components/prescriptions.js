import { useEffect, useState } from "react";
import { auth, db } from "../config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { TextTranscribe } from "./TextTranscribe";
import "../styles/prescription.css";

export const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const accountsRef = collection(db, "accounts");
        const q = query(accountsRef, where("Userid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setUserRole(doc.data().Role);
        }
      } else {
        navigate("/waiting"); //not necessary because protected route already ensure this
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const prescriptionsRef = collection(db, "prescriptions");
        const querySnapshot = await getDocs(prescriptionsRef);
        const prescriptionsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPrescriptions(prescriptionsData);
      } catch (error) {
        console.error("Error fetching prescriptions: ", error);
      }
    };

    fetchPrescriptions();
  }, []);

  const handleDone = async (prescriptionId) => {
    if (window.confirm("Has this prescription been given to the patient?")) {
      try {
        await deleteDoc(doc(db, "prescriptions", prescriptionId));
        setPrescriptions(
          prescriptions.filter(
            (prescription) => prescription.id !== prescriptionId
          )
        );
      } catch (error) {
        console.error("Error marking prescription as done: ", error);
      }
    }
  };

  // const handleSearchChange = (event) => {
  //   setSearchQuery(event.target.value);
  // };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const searchText = searchQuery.toLowerCase();
    return (
      prescription.patientName.toLowerCase().includes(searchText) ||
      prescription.doctorName.toLowerCase().includes(searchText) ||
      prescription.prescriptions.toLowerCase().includes(searchText)
    );
  });

  return (
    <div>
      <h1>Prescriptions</h1>
      <div style={{width: "90%", margin: "auto"}}>
        <TextTranscribe
          placeholder="Search prescriptions..."
          textFunc={(t) => setSearchQuery(t.value)}
          text={searchQuery}
          isInput={true}
        />
      </div>

      <br />
      <div className="prescription-container">
        {filteredPrescriptions.length > 0 ? (
          filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="prescription-box">
              {/* Display prescription details here */}
              <div className="prescription-text">
                Patient Name: {prescription.patientName}
                <br />
                Appointment Date:{" "}
                {format(prescription.appointmentDate.toDate(), "dd/MM/yyyy")}
                <br />
                Appointment Time: {prescription.appointmentTime}
                <br />
                Doctor ID: {prescription.doctorId}
                <br />
                Doctor Name: {prescription.doctorName}
                <br />
                <div className="prescription-text-long">
                  Prescriptions: {prescription.prescriptions}
                </div>
              </div>

              {userRole === "nurse" && (
                <button onClick={() => handleDone(prescription.id)}>
                  Done
                </button>
              )}
            </div>
          ))
        ) : (
          <h1>No data!</h1>
        )}
      </div>
    </div>
  );
};
