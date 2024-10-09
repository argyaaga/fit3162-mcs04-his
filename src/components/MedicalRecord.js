import { useState, useEffect } from "react";
import { auth, db } from "../config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { TextTranscribe } from "./TextTranscribe";
import "../styles/medicalrecord.css";

export const MedicalRecord = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [doctorId, setDoctorId] = useState(null);
  const [patientName, setPatientName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setDoctorId(user.uid);
      } else {
        // Handle unauthenticated user (e.g., redirect to login)
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSearch = async () => {
    setErrorMessage(""); // Clear any previous error messages
    setMedicalRecords([]); // Clear previous search results
    setPatientName("");

    if (!searchQuery.trim()) {
      setErrorMessage("Please enter a patient name or ID.");
      return;
    }

    try {
      let patientId = null;

      // Check if searchQuery is a valid patient ID
      if (searchQuery.length === 20) {
        // Assuming patient IDs are 20 characters long
        const patientsRef = collection(db, "patients");
        const patientIdQuery = query(
          patientsRef,
          where("id", "==", searchQuery)
        );
        const patientIdSnapshot = await getDocs(patientIdQuery);

        if (!patientIdSnapshot.empty) {
          patientId = searchQuery;
          setPatientName(patientIdSnapshot.docs[0].data().name); // Set patient name if found by ID
        }
      }

      // If not a valid ID, search by patient name (case-insensitive)
      if (!patientId) {
        const patientsRef = collection(db, "patients");
        const patientNameQuery = query(patientsRef); // Fetch all patients
        const patientNameSnapshot = await getDocs(patientNameQuery);

        const matchingPatient = patientNameSnapshot.docs.find(
          (doc) => doc.data().name.toLowerCase() === searchQuery.toLowerCase()
        );

        if (!matchingPatient) {
          setErrorMessage("Patient not found.");
          return;
        }

        patientId = matchingPatient.id;
        setPatientName(matchingPatient.data().name); // Set patient name if found by name
      }
      // Fetch medical records for the patient under the current doctor
      const medicalRecordsRef = collection(db, "medicalrecord");
      const medicalRecordQuery = query(
        medicalRecordsRef,
        where("patientId", "==", patientId)
      );
      const medicalRecordSnapshot = await getDocs(medicalRecordQuery);

      if (medicalRecordSnapshot.empty) {
        setErrorMessage(
          "No medical record found for this patient under your care."
        );
        return;
      }

      const filteredRecords = medicalRecordSnapshot.docs[0]
        .data()
        .appointmentsList.filter((appt) => appt.doctorId === doctorId);

      if (filteredRecords.length === 0) {
        setErrorMessage(
          "No medical record found for this patient under your care."
        );
        return;
      }

      setMedicalRecords(filteredRecords);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      setErrorMessage("An error occurred while fetching medical records.");
    }
  };

  return (
    <div>
      <h1>Medical Records</h1>
      <div style={{width: "90%", margin: "auto"}}>
        <TextTranscribe
          placeholder="Search by patient name or ID"
          textFunc={(t) => setSearchQuery(t.value)}
          text={searchQuery}
          isInput={true}
        />
      </div>
      {/* <input
        type="text"
        placeholder="Search by patient name or ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      /> */}
      <button onClick={handleSearch}>Search</button>
      <br></br>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <br></br>
      {/* Display medical records if available */}
      {medicalRecords.length > 0 ? (
        <div className="record-container">
          <h3>Medical Records for {patientName}</h3>
          <table className="medical-record-table">
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Date</th>
                <th>Time</th>
                <th>Doctor</th>
                <th>Location</th>
                <th>Reason</th>
                <th>Prescriptions</th>
                <th>Doctor's Notes</th>
              </tr>
            </thead>
            <tbody>
              {medicalRecords.map((appt, index) => (
                <tr key={index}>
                  <td data-label="Appointment">
                    {medicalRecords.length - index}
                  </td>
                  <td data-label="Date">
                    {appt.appointmentDate.toDate().toLocaleDateString()}
                  </td>
                  <td data-label="Time">{appt.appointmentTime}</td>
                  <td data-label="Doctor">{appt.doctorName}</td>
                  <td data-label="Location">{appt.location}</td>
                  <td data-label="Reason">{appt.reason}</td>
                  <td data-label="Prescriptions">
                    {appt.prescriptions || "N/A"}
                  </td>
                  <td data-label="Doctor's Notes">
                    {appt.doctorNotes || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <h1></h1>
      )}
    </div>
  );
};
