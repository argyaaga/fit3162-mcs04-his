import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays } from "date-fns"; // For date calculations
import { format, startOfDay, endOfDay } from "date-fns";
import TimePicker from "react-time-picker";
import placeholderAvatar from "../images/Profile_avatar_placeholder_large.png";
import "../styles/appointment.css";
import { TextTranscribe } from "./TextTranscribe";

export const Appointment = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  const initialPatientId = location.state?.patientId || "";
  const [patientName, setPatientName] = useState(""); // New state to store patient name

  const [appointments, setAppointments] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isDoctorEditing, setIsDoctorEditing] = useState(false);
  const [isNurseEditing, setIsNurseEditing] = useState(false);
  const [isViewingMedicalRecord, setIsViewingMedicalRecord] = useState(false);

  // New state variable to trigger re-fetch
  const [triggerRefresh, setTriggerRefresh] = useState(false);

  // State to store the search query
  const [searchQuery, setSearchQuery] = useState("");

  // Additional state to store fetched doctor and patient names
  const [doctorNames, setDoctorNames] = useState({});
  const [patientNames, setPatientNames] = useState({});

  // State to store fetched doctors and patients
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  // State to track if viewing medical record
  // const [viewingMedicalRecord, setViewingMedicalRecord] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState(null);

  // State to track if viewing medical record in a modal
  // const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);

  // State to track if the edit modal is open
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State to track if the nurse edit modal is open
  // const [isNurseEditModalOpen, setIsNurseEditModalOpen] = useState(false);

  // State to control the filter mode
  const [filterMode, setFilterMode] = useState("today");

  // State to store fetched patient avatar URLs
  const [patientAvatars, setPatientAvatars] = useState({});

  // state to manage appointment details modal
  const [isAppointmentDetailsModalOpen, setIsAppointmentDetailsModalOpen] =
    useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] =
    useState(null);

  const [isHovered, setIsHovered] = useState(false);

  // styles for the modal
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#DAF0EE", // Light blue color
      color: "black", // Set text color
      padding: "20px", // Enable vertical scrolling if content overflows
      maxHeight: "80vh", // Set a maximum height for the modal (adjust as needed)
      maxWidth: "60%", // Set max width so the Modal doesn't take the entire width of the screen, especially with the medical record
      minWidth: "30%",
      wordWrap: "break-word", // Ensure long words break
      overflowWrap: "break-word", // Ensure long words break
    },
    overlay: {
      zIndex: 3,
    },
  };

  // Additional styles for input elements within the modal
  const customInputStyles = {
    border: "1px solid black",
    color: "black", //test colour here
    // Add any other desired input styles here
  };

  const dateStyle = {
    color: "black",
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openApptModal = () => {
    setIsApptModalOpen(true);
  };

  const closeApptModal = () => {
    setIsApptModalOpen(false);
    setIsDoctorEditing(false);
    setIsNurseEditing(false);
    setIsViewingMedicalRecord(false);
    setViewedAppointment({
      id: "",
      appointmentDate: addDays(new Date(), 1), //Default to tommorrow
      appointmentTime: "10:00", //Default time (you can adjust as needed)
      doctorId: "",
      location: "",
      patientId: "",
      reason: "",
      finishedAt: "",
      prescriptions: "",
      doctorNotes: "",
      status: false, // Default status
    });
  };

  // State for add appointment form within the modal
  const [newAppointment, setNewAppointment] = useState({
    appointmentDate: addDays(new Date(), 1), //Default to tommorrow
    appointmentTime: "10:00", //Default time (you can adjust as needed)
    doctorId: "",
    location: "",
    patientId: "",
    reason: "",
    finishedAt: "",
    status: false, // Default status
  });

  // State for edit appointment form (doctor only)
  const [editedAppointment, setEditedAppointment] = useState({
    prescriptions: "",
    doctorNotes: "",
  });

  const [viewedAppointment, setViewedAppointment] = useState({
    id: "",
    appointmentDate: addDays(new Date(), 1), //Default to tommorrow
    appointmentTime: "10:00", //Default time (you can adjust as needed)
    doctorId: "",
    location: "",
    patientId: "",
    reason: "",
    finishedAt: "",
    prescriptions: "",
    doctorNotes: "",
    status: false, // Default status
  });

  const setViewedPrescription = (prescriptionText) => {
    setViewedAppointment({
      ...viewedAppointment,
      prescriptions: prescriptionText.value,
    });
  };

  const setViewedDoctorNotes = (doctorNotesText) => {
    setViewedAppointment({
      ...viewedAppointment,
      doctorNotes: doctorNotesText.value,
    });
  };

  const setViewedLocation = (locationText) => {
    setViewedAppointment({
      ...viewedAppointment,
      location: locationText.value,
    });
  };

  // State for edit appointment form (nurse only)
  const [editedAppointmentNurse, setEditedAppointmentNurse] = useState({
    appointmentDate: null,
    appointmentTime: "",
    location: "",
  });

  // Fetch doctors and patients on component mount
  useEffect(() => {
    const fetchDoctorsAndPatients = async () => {
      try {
        const doctorsRef = collection(db, "doctors");
        const patientsRef = collection(db, "patients");

        const doctorsSnapshot = await getDocs(doctorsRef);
        const patientsSnapshot = await getDocs(patientsRef);

        const doctorsData = doctorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const patientsData = patientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDoctors(doctorsData);
        setPatients(patientsData);
      } catch (error) {
        console.error("Error fetching doctors and patients: ", error);
        // Handle the error appropriately (e.g., show an error message to the user)
      }
    };

    fetchDoctorsAndPatients();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Fetch doctor and patient names on component mount or when appointments change
  useEffect(() => {
    const fetchNames = async () => {
      const doctorsRef = collection(db, "doctors");
      const patientsRef = collection(db, "patients");

      const doctorsSnapshot = await getDocs(doctorsRef);
      const patientsSnapshot = await getDocs(patientsRef);

      const doctorNameMap = {};
      const patientNameMap = {};

      doctorsSnapshot.forEach((doc) => {
        doctorNameMap[doc.id] = doc.data().Name; // Assuming 'Name' field in doctors collection
      });

      patientsSnapshot.forEach((doc) => {
        patientNameMap[doc.id] = doc.data().name; // Assuming 'name' field in patients collection
      });

      setDoctorNames(doctorNameMap);
      setPatientNames(patientNameMap);
    };

    fetchNames();
  }, [appointments]); // Re-fetch names if appointments change

  // Fetch user role on component mount
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
        navigate("/"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // Fetch appointments based on user role and filter mode
  useEffect(() => {
    const fetchAppointments = async () => {
      const appointmentsRef = collection(db, "appointments");
      let q;

      if (userRole === "nurse") {
        q = query(appointmentsRef);
      } else if (userRole === "doctor") {
        // If initialPatientId is present, filter by patientId, otherwise use the existing logic
        if (initialPatientId) {
          q = query(
            appointmentsRef,
            where("patientId", "==", initialPatientId)
          );
        } else {
          q = query(
            appointmentsRef,
            where("doctorId", "==", auth.currentUser.uid)
          );
        }
      }

      if (q) {
        const querySnapshot = await getDocs(q);
        const appointmentsData = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        // Apply filtering based on filterMode
        let filteredAppointments = appointmentsData;
        if (filterMode === "today") {
          const today = new Date();
          filteredAppointments = appointmentsData.filter((appointment) => {
            const appointmentDate = appointment.appointmentDate.toDate();
            return (
              appointmentDate >= startOfDay(today) &&
              appointmentDate <= endOfDay(today)
            );
          });
        }

        setAppointments(filteredAppointments);
      }
    };

    const fetchPatientName = async () => {
      if (initialPatientId) {
        try {
          const patientDocRef = doc(db, "patients", initialPatientId);
          const patientDocSnap = await getDoc(patientDocRef);

          if (patientDocSnap.exists()) {
            setPatientName(patientDocSnap.data().name);
          } else {
            console.error("No such patient document!");
          }
        } catch (error) {
          console.error("Error fetching patient name: ", error);
        }
      }
    };

    if (userRole) {
      fetchAppointments();
    }

    // Fetch patient name if initialPatientId is present
    fetchPatientName();

    // Set the initial search query when the component mounts or if the location changes
    setSearchQuery(patientName); // Set searchQuery to patientName
  }, [
    userRole,
    isEditing,
    viewedAppointment,
    triggerRefresh,
    filterMode,
    initialPatientId,
    location,
    patientName,
  ]);

  // Fetch patient avatar URLs on component mount or when patients change
  useEffect(() => {
    const fetchAvatars = async () => {
      const patientsRef = collection(db, "patients");
      const patientsSnapshot = await getDocs(patientsRef);

      const avatarMap = {};
      patientsSnapshot.forEach((doc) => {
        avatarMap[doc.id] = doc.data().avatarURL || placeholderAvatar;
      });

      setPatientAvatars(avatarMap);
    };

    fetchAvatars();
  }, [patients]); // Re-fetch avatars if patients change

  // const handleViewMedicalRecord = async (patientId) => {
  //   try {
  //     const medicalRecordsRef = collection(db, "medicalrecord");
  //     const q = query(medicalRecordsRef, where("patientId", "==", patientId));
  //     const querySnapshot = await getDocs(q);

  //     if (!querySnapshot.empty) {
  //       const medicalRecordData = querySnapshot.docs[0].data();

  //       setMedicalRecord(medicalRecordData);
  //       setViewingMedicalRecord(true);
  //       setIsMedicalRecordModalOpen(true);
  //     } else {
  //       // Handle case where no medical record exists for the patient
  //       console.log("No medical record found for this patient.");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching medical record: ", error);
  //   }
  // };

  const handleViewMedicalRecordAppt = async (patientId) => {
    try {
      const medicalRecordsRef = collection(db, "medicalrecord");
      const q = query(medicalRecordsRef, where("patientId", "==", patientId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const medicalRecordData = querySnapshot.docs[0].data();

        setMedicalRecord(medicalRecordData);
        // Open the medical record modal with the fetched data
        setIsViewingMedicalRecord(true);
      } else {
        // Handle case where no medical record exists for the patient
        console.log("No medical record found for this patient.");
      }
    } catch (error) {
      console.error("Error fetching medical record: ", error);
    }
  };

  // const closeMedicalRecordModal = () => {
  //   setIsMedicalRecordModalOpen(false);
  // };

  const handleAddAppointmentChange = (target) => {
    const { name, value } = target;
    setNewAppointment({ ...newAppointment, [name]: value });
  };

  const handleAddAppointmentSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    try {
      await addDoc(collection(db, "appointments"), newAppointment);
      closeAddModal(); // Close the modal after successful submission

      // You might want to reset the newAppointment state here if needed
      // Trigger re-fetch after adding
      setTriggerRefresh(!triggerRefresh);
    } catch (error) {
      console.error("Error adding appointment: ", error);
      // Handle error, maybe display an error message to the user
    }
  };

  const handleViewAppointment = (appointmentId) => {
    const appointmentToView = appointments.find(
      (appt) => appt.id === appointmentId
    );
    // setSelectedAppointment(appointmentToView);

    if (!isApptModalOpen) {
      setViewedAppointment({
        id: appointmentToView.id || "",
        appointmentDate:
          appointmentToView.appointmentDate || addDays(new Date(), 1),
        appointmentTime: appointmentToView.appointmentTime || "10:00",
        doctorId: appointmentToView.doctorId || "",
        location: appointmentToView.location || "",
        patientId: appointmentToView.patientId || "",
        reason: appointmentToView.reason || "",
        finishedAt: appointmentToView.finishedAt || "",
        prescriptions: appointmentToView.prescriptions || "",
        doctorNotes: appointmentToView.doctorNotes || "",
        status: appointmentToView.status || false, // Default status
      });
      setIsApptModalOpen(true);
    }
  };

  // const handleEditAppointment = (appointmentId) => {
  //   const appointmentToEdit = appointments.find(
  //     (appt) => appt.id === appointmentId
  //   );
  //   setSelectedAppointment(appointmentToEdit);

  //   if (userRole === "doctor") {
  //     setIsEditing(true);

  //     // Populate edit form fields for doctor
  //     setEditedAppointment({
  //       prescriptions: appointmentToEdit.prescriptions || "",
  //       doctorNotes: appointmentToEdit.doctorNotes || "",
  //     });

  //     // Open the edit modal for doctor
  //     setIsEditModalOpen(true);
  //   } else if (userRole === "nurse") {
  //     // Populate edit form fields for nurse
  //     setEditedAppointmentNurse({
  //       appointmentDate: appointmentToEdit.appointmentDate,
  //       appointmentTime: appointmentToEdit.appointmentTime,
  //       location: appointmentToEdit.location,
  //     });

  //     // Open the edit modal for nurse
  //     setIsNurseEditModalOpen(true);
  //   }
  // };

  // const handleSaveEdit = async () => {
  //   try {
  //     const appointmentRef = doc(db, "appointments", selectedAppointment.id);
  //     await updateDoc(appointmentRef, editedAppointment);
  //     setIsEditing(false); // do not need this line but for future code
  //     setIsEditModalOpen(false); // Close the modal after saving
  //     setSelectedAppointment(null);
  //     // No need to manually refresh here
  //   } catch (error) {
  //     console.error("Error updating appointment: ", error);
  //   }
  // };

  // //errr dont ask why repeat >:(
  // const handleSaveNurseEdit = async () => {
  //   try {
  //     const appointmentRef = doc(db, "appointments", selectedAppointment.id);
  //     await updateDoc(appointmentRef, editedAppointmentNurse);
  //     setIsNurseEditModalOpen(false); // Close the modal after saving
  //     setSelectedAppointment(null);
  //   } catch (error) {
  //     console.error("Error updating appointment: ", error);
  //   }
  // };

  const handleSaveViewEdit = async () => {
    try {
      const appointmentRef = doc(db, "appointments", viewedAppointment.id);
      await updateDoc(appointmentRef, viewedAppointment);
      setIsEditing(false); // do not need this line but for future code
      setIsNurseEditing(false);
      setIsDoctorEditing(false);
      // No need to manually refresh here
    } catch (error) {
      console.error("Error updating appointment: ", error);
    }
  };

  const handleFinishAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to finish this appointment?")) {
      try {
        // 1. Update appointment status to true
        const appointmentRef = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentRef, {
          status: true,
          finishedAt: serverTimestamp(),
        });

        // 2. Fetch appointment details
        const appointmentSnapshot = await getDoc(appointmentRef);
        const appointmentData = appointmentSnapshot.data();

        // 3. Find or create medical record for the patient
        const medicalRecordsRef = collection(db, "medicalrecord");
        const patientId = appointmentData.patientId;
        const q = query(medicalRecordsRef, where("patientId", "==", patientId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Create new medical record
          await addDoc(medicalRecordsRef, {
            patientId,
            appointmentsList: [
              {
                appointmentId,
                appointmentDate: appointmentData.appointmentDate,
                appointmentTime: appointmentData.appointmentTime,
                doctorNotes: appointmentData.doctorNotes || "", // Handle potential undefined
                doctorid: appointmentData.doctorId,
                location: appointmentData.location,
                patientId: appointmentData.patientId,
                prescriptions: appointmentData.prescriptions || "", // Handle potential undefined
                finishedAt: appointmentData.finishedAt,
                reason: appointmentData.reason,
                doctorName: doctorNames[appointmentData.doctorId] || "N/A", // Include doctorName
              },
            ],
          });
        } else {
          // Update existing medical record
          const medicalRecordDoc = querySnapshot.docs[0];
          const medicalRecordRef = doc(
            db,
            "medicalrecord",
            medicalRecordDoc.id
          );
          const updatedAppointmentsList = [
            {
              appointmentId,
              appointmentDate: appointmentData.appointmentDate,
              appointmentTime: appointmentData.appointmentTime,
              doctorNotes: appointmentData.doctorNotes || "", // Handle potential undefined,
              doctorId: appointmentData.doctorId,
              location: appointmentData.location,
              patientId: appointmentData.patientId,
              prescriptions: appointmentData.prescriptions || "",
              finishedAt: appointmentData.finishedAt,
              reason: appointmentData.reason,
              doctorName: doctorNames[appointmentData.doctorId] || "N/A", // Include doctorName
            },
            ...medicalRecordDoc.data().appointmentsList,
          ];
          await updateDoc(medicalRecordRef, {
            appointmentsList: updatedAppointmentsList,
          });
        }

        // 4. Add a new document to the prescriptions list
        if (appointmentData.prescriptions) {
          // Only add if there are prescriptions
          const prescriptionsRef = collection(db, "prescriptions");
          await addDoc(prescriptionsRef, {
            appointmentId,
            appointmentDate: appointmentData.appointmentDate,
            appointmentTime: appointmentData.appointmentTime,
            patientId,
            patientName: patientNames[appointmentData.patientId],
            doctorName: doctorNames[appointmentData.doctorId],
            doctorId: appointmentData.doctorId,
            prescriptions: appointmentData.prescriptions,
            finishedAt: appointmentData.finishedAt, // You can add more fields if needed
          });
        }

        // 5. Delete the appointment from appointments collection
        await deleteDoc(appointmentRef);

        // Trigger re-fetch after adding
        setTriggerRefresh(!triggerRefresh);
      } catch (error) {
        console.error("Error finishing appointment: ", error);
      }
      setIsApptModalOpen(false);
    }
  };

  // Filtered appointments based on search and filter mode
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesFilter =
      filterMode === "all" ||
      (filterMode === "today" &&
        appointment.appointmentDate.toDate() >= startOfDay(new Date()) &&
        appointment.appointmentDate.toDate() <= endOfDay(new Date()));

    const matchesSearch =
      searchQuery === "" ||
      format(appointment.appointmentDate.toDate(), "dd/MM/yyyy").includes(
        searchQuery
      ) ||
      appointment.appointmentTime.includes(searchQuery) ||
      (doctorNames[appointment.doctorId] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (patientNames[appointment.patientId] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      appointment.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.reason.toLowerCase().includes(searchQuery.toLowerCase());

    // doctornames also neeed for nurse.
    return matchesFilter && matchesSearch;
  });

  const handleViewAppointmentDetails = (appt) => {
    setSelectedAppointmentDetails(appt);
    setIsAppointmentDetailsModalOpen(true);
  };

  return (
    <div>
      <h1>Appointments</h1>
      {/* Add Appointment button (logic to control visibility based on role) */}
      {(userRole === "doctor" || userRole === "nurse") && (
        <>
          {/* Search bar */}
          {/* <input
            type="text"
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          /> */}
          <div style={{ width: "90%", margin: "auto" }}>
            <label htmlFor="filterSelect">Filter:</label>
            <select
              id="filterSelect"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="today">Today's Appointments</option>
              <option value="all">All Appointments</option>
            </select>
            <TextTranscribe
              placeholder="Search appointments..."
              textFunc={(t) => setSearchQuery(t.value)}
              text={searchQuery}
              isInput={true}
            />
          </div>

          <button onClick={openAddModal}>Add Appointment</button>
          <br></br>

          <Modal
            isOpen={isApptModalOpen}
            onRequestClose={closeApptModal}
            contentLabel="View Appointment Modal"
            style={customStyles} // Apply custom styles
          >
            {isViewingMedicalRecord ? (
              <div>
                {medicalRecord && (
                  <div>
                    <h3>
                      Medical Record for {patientNames[medicalRecord.patientId]}
                    </h3>
                    <button
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 5,
                        Color: isHovered ? "white" : "black", // Change color on hover
                        backgroundColor: "#DAF0EE",
                        fontSize: "1.5rem",
                      }}
                      onClick={() => setIsViewingMedicalRecord(false)}
                    >
                      X
                    </button>
                    {/* Display medical record details here */}
                    {/* Display appointment summaries in small boxes */}
                    <div className="appointment-summary-container">
                      {medicalRecord.appointmentsList.map((appt, index) => (
                        <div
                          key={index}
                          className="appointment-summary-box"
                          onClick={() => handleViewAppointmentDetails(appt)}
                          style={{ marginBottom: "20px" }}
                        >
                          <h4>
                            Appointment{" "}
                            {medicalRecord.appointmentsList.length - index}
                          </h4>
                          <p>
                            Date:{" "}
                            {appt.appointmentDate.toDate().toLocaleDateString()}
                          </p>
                          <p>Time: {appt.appointmentTime}</p>
                          <p>Doctor: {appt.doctorName}</p>
                          <p>Location: {appt.location}</p>
                          <p>Reason: {appt.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3>View Appointment</h3>
                {isNurseEditing ? (
                  <div>
                    {/* Date picker for appointmentDate */}
                    <div>
                      <label htmlFor="appointmentDateNurse">
                        Appointment Date:
                      </label>
                      <DatePicker
                        id="appointmentDateNurse"
                        selected={
                          viewedAppointment.appointmentDate instanceof Date
                            ? viewedAppointment.appointmentDate.toDate()
                            : viewedAppointment.appointmentDate?.toDate() ||
                              null
                        }
                        onChange={(date) =>
                          setViewedAppointment({
                            ...viewedAppointment,
                            appointmentDate: date,
                          })
                        }
                        minDate={addDays(new Date(), 1)}
                        dateFormat="dd/MM/yyyy"
                        wrapperClassName="black-border"
                        popperClassName="react-datepicker__popper"
                      />
                      <style>{`
                      .react-datepicker__popper * { 
                          color: black !important; 
                      }
                    `}</style>
                    </div>
                    {/* Time picker for appointmentTime */}
                    <div>
                      <label htmlFor="appointmentTimeNurse">
                        Appointment Time:
                      </label>
                      <TimePicker
                        id="appointmentTimeNurse"
                        name="appointmentTime"
                        value={viewedAppointment.appointmentTime}
                        onChange={(time) =>
                          setViewedAppointment({
                            ...viewedAppointment,
                            appointmentTime: time,
                          })
                        }
                        disableClock={false}
                        className="custom-time-picker"
                        format="H:m"
                      />
                    </div>
                    {/* Input for location */}
                    <div>
                      <label htmlFor="locationNurse">Location:</label>
                      <TextTranscribe
                        textFunc={setViewedLocation}
                        text={viewedAppointment.location}
                        style={customInputStyles}
                        isInput={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p>
                      Date:{" "}
                      {isNaN(
                        new Date(viewedAppointment.appointmentDate).getTime()
                      )
                        ? format(
                            viewedAppointment.appointmentDate.toDate(),
                            "dd/MM/yyyy"
                          ) || "Loading..."
                        : "N/A"}
                    </p>
                    <p>
                      Time:{" "}
                      {viewedAppointment.appointmentTime
                        ? viewedAppointment.appointmentTime || "Loading..."
                        : "N/A"}
                    </p>{" "}
                    <p>Location: {viewedAppointment.location}</p>
                  </div>
                )}

                <div>
                  <p>
                    Doctor:{" "}
                    {viewedAppointment.doctorId
                      ? doctorNames[viewedAppointment.doctorId] || "Loading..."
                      : "N/A"}
                  </p>
                  <p>
                    Patient:{" "}
                    {viewedAppointment.patientId
                      ? patientNames[viewedAppointment.patientId] ||
                        "Loading..."
                      : "N/A"}
                  </p>
                  <p>Reason: {viewedAppointment.reason}</p>

                  {isDoctorEditing ? (
                    <div>
                      <label htmlFor="prescriptions">Prescriptions:</label>{" "}
                      <br />
                      <TextTranscribe
                        textFunc={setViewedPrescription}
                        text={viewedAppointment.prescriptions}
                      />
                      <br />
                      <label htmlFor="doctorNotes">Doctor's Notes:</label>{" "}
                      <br />
                      <TextTranscribe
                        textFunc={setViewedDoctorNotes}
                        text={viewedAppointment.doctorNotes}
                      />
                    </div>
                  ) : (
                    <div>
                      <p>
                        Prescriptions:{" "}
                        {viewedAppointment.prescriptions || "N/A"}
                      </p>{" "}
                      <p>
                        Doctor's Notes: {viewedAppointment.doctorNotes || "N/A"}
                      </p>{" "}
                    </div>
                  )}
                  <p>
                    Status: {viewedAppointment.status ? "Finished" : "Pending"}
                  </p>
                </div>

                {userRole === "doctor" &&
                  viewedAppointment.status === false &&
                  !(isDoctorEditing || isNurseEditing) && (
                    <>
                      <button
                        onClick={() =>
                          handleFinishAppointment(viewedAppointment.id)
                        }
                      >
                        Finish
                      </button>
                      <button
                        onClick={() =>
                          handleViewMedicalRecordAppt(
                            viewedAppointment.patientId
                          )
                        }
                      >
                        View Medical Record
                      </button>
                    </>
                  )}

                {isDoctorEditing || isNurseEditing ? (
                  <button onClick={handleSaveViewEdit}>Save</button>
                ) : (
                  ""
                )}
                {userRole === "doctor" ? (
                  isDoctorEditing ? (
                    <button onClick={() => setIsDoctorEditing(false)}>
                      Cancel
                    </button>
                  ) : (
                    <button onClick={() => setIsDoctorEditing(true)}>
                      Edit
                    </button>
                  )
                ) : (
                  ""
                )}
                {userRole === "nurse" ? (
                  isNurseEditing ? (
                    <button onClick={() => setIsNurseEditing(false)}>
                      Cancel
                    </button>
                  ) : (
                    <button onClick={() => setIsNurseEditing(true)}>
                      Edit
                    </button>
                  )
                ) : (
                  ""
                )}
                <button onClick={closeApptModal}>Close</button>
              </div>
            )}
          </Modal>

          {/* New Modal for Appointment Details */}
          <Modal
            isOpen={isAppointmentDetailsModalOpen}
            onRequestClose={() => setIsAppointmentDetailsModalOpen(false)}
            contentLabel="Appointment Details Modal"
            style={customStyles}
          >
            {selectedAppointmentDetails ? (
              <div>
                <h3>Appointment Details</h3>
                {/* Display full appointment details from selectedAppointmentDetails */}
                <p>
                  Date:{" "}
                  {selectedAppointmentDetails.appointmentDate
                    .toDate()
                    .toLocaleDateString()}
                </p>
                <p>Time: {selectedAppointmentDetails.appointmentTime}</p>
                <p>Doctor: {selectedAppointmentDetails.doctorName}</p>
                <p>Location: {selectedAppointmentDetails.location}</p>
                <p>Reason: {selectedAppointmentDetails.reason}</p>
                <p>
                  Prescriptions:{" "}
                  {selectedAppointmentDetails.prescriptions || "N/A"}
                </p>
                <p>
                  Doctor's Notes:{" "}
                  {selectedAppointmentDetails.doctorNotes || "N/A"}
                </p>
                <button onClick={() => setIsAppointmentDetailsModalOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <p>No data!</p>
            )}
          </Modal>

          <Modal
            isOpen={isAddModalOpen}
            onRequestClose={closeAddModal}
            contentLabel="Add Appointment Modal"
            style={customStyles} // Apply custom styles
          >
            <h3>Add New Appointment</h3>
            <form onSubmit={handleAddAppointmentSubmit}>
              <div>
                <label htmlFor="appointmentDate">Appointment Date:</label>
                <DatePicker
                  id="appointmentDate"
                  selected={newAppointment.appointmentDate}
                  onChange={(date) =>
                    setNewAppointment({
                      ...newAppointment,
                      appointmentDate: date,
                    })
                  }
                  minDate={addDays(new Date(), 1)} // Minimum selectable date is tomorrow
                  dateFormat="dd/MM/yyyy"
                  wrapperClassName="black-border" // Apply style to the wrapper as well
                  popperClassName="react-datepicker__popper"
                />
                {/* Style the date picker elements */}
                <style>{`
                .react-datepicker__popper * { 
                    color: black !important; 
                }
              `}</style>
              </div>

              <div>
                <label htmlFor="appointmentTime">Appointment Time:</label>
                <TimePicker
                  id="appointmentTime"
                  name="appointmentTime"
                  value={newAppointment.appointmentTime}
                  onChange={(time) =>
                    setNewAppointment({
                      ...newAppointment,
                      appointmentTime: time,
                    })
                  }
                  disableClock={true} // Optional: Disable the clock for simpler input
                  className="custom-time-picker"
                  format="H:m"
                />
              </div>

              {/* Add other form fields for doctorId, location, patientId, reason, etc. */}
              <div>
                <label htmlFor="doctorId">Doctor:</label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={newAppointment.doctorId}
                  onChange={(e) => handleAddAppointmentChange(e.target)}
                  required
                >
                  <option value="">Select Doctor</option>
                  {/* Fetch and populate options from your 'doctors' collection */}
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.Name} {/* 'Name' field in doctors collection */}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="location">Location:</label>
                <TextTranscribe
                  name="location"
                  textFunc={handleAddAppointmentChange}
                  text={newAppointment.location}
                  style={customInputStyles}
                  isInput={true}
                />
              </div>

              <div>
                <label htmlFor="patientId">Patient:</label>
                <select
                  id="patientId"
                  name="patientId"
                  value={newAppointment.patientId}
                  onChange={(e) => handleAddAppointmentChange(e.target)}
                  required
                  style={customInputStyles} // Apply the customInputStyles
                >
                  {/* Fetch and populate options from your 'patients' collection */}
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}{" "}
                      {/* Assuming 'name' field in patients collection */}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reason">Reason:</label>
                <TextTranscribe
                  name="reason"
                  textFunc={handleAddAppointmentChange}
                  text={newAppointment.reason}
                  style={customInputStyles}
                />
              </div>

              <button type="submit">Add Appointment</button>
              <button onClick={closeAddModal}>Cancel</button>
            </form>
          </Modal>
        </>
      )}
      {/* Appointments list */}
      <br></br>
      <div className="appointment-container">
        {filteredAppointments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Patient ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Doctor</th>
                <th>Location</th>
                <th>Reason</th>
                <th className="prescriptions">Prescriptions</th>
                <th className="doctor-notes">Doctor's Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr
                  key={appointment.id}
                  onClick={() => handleViewAppointment(appointment.id)}
                >
                  <td>
                    <img
                      className="avatar-image"
                      src={
                        patientAvatars[appointment.patientId] ||
                        placeholderAvatar
                      }
                      alt="Patient Avatar"
                    />
                  </td>
                  <td data-label="Patient Name">
                    {patientNames[appointment.patientId] || "Loading..."}
                  </td>
                  <td data-label="Patient ID">{appointment.patientId}</td>
                  <td data-label="Date">
                    {format(appointment.appointmentDate.toDate(), "dd/MM/yyyy")}
                  </td>
                  <td data-label="Time">{appointment.appointmentTime}</td>
                  <td data-label="Doctor">
                    {doctorNames[appointment.doctorId] || "Loading..."}
                  </td>
                  <td data-label="Location">{appointment.location}</td>
                  <td data-label="Reason">{appointment.reason}</td>
                  <td data-label="Prescriptions">
                    {appointment.prescriptions || "N/A"}
                  </td>
                  <td data-label="Doctor's Notes">
                    {appointment.doctorNotes || "N/A"}
                  </td>
                  <td data-label="Status">
                    {appointment.status ? "Finished" : "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <h1>No data!</h1>
        )}
      </div>
    </div>
  );
};
