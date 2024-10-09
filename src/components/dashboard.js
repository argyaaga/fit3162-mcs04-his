import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { ProtectedRoute } from "./ProtectedRoute";
import Sidebar from "./sidebar"; // Import the Sidebar component
import profileSvg from "../images/profile.svg";
import patientSvg from "../images/patient.svg";
import medicineSvg from "../images/medicine.svg";
import appointmentSvg from "../images/appointment.svg";
import accountSvg from "../images/account.svg";
import logoutSvg from "../images/logout.svg"; // Import the logout SVG
import "../styles/dashboard.css";
import { TextTranscribe } from "./TextTranscribe";
import Patient from "./patient";
import { MedicalRecord } from "./MedicalRecord";
import woman from "../images/woman.png";
import { Account } from "./account";
import { Medicine } from "./medicine";
import { Appointment } from "./appointment";
import { Prescriptions } from "./prescriptions";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const accountsCollectionRef = collection(db, "accounts");
  const medicineCollectionRef = collection(db, "medicines");
  const patientsCollectionRef = collection(db, "patients");
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState([null, null, null, null, null, null]);

  const [testText, setTestText] = useState("");

  const [windowHeight, setWindowHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);
  const [dashboardHeight, setDashboardHeight] = useState(0);
  const [buttonGridWidth, setButtonGridWidth] = useState(0);

  const reportWindowSize = () => {
    setWindowHeight(document.documentElement.clientHeight);
    setWindowWidth(document.documentElement.clientWidth);
    if (windowWidth < 975) {
      setButtonGridWidth(500);
      setDashboardHeight(375);
    } else {
      setButtonGridWidth(windowWidth);
      setDashboardHeight(245);
    }
    console.log(buttonGridWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", reportWindowSize);
  }, [windowHeight, windowWidth]);

  useEffect(() => {
    setWindowHeight(document.documentElement.clientHeight);
    setWindowWidth(document.documentElement.clientWidth);
    setButtonGridWidth(document.documentElement.clientWidth);
    setDashboardHeight(245);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Optimistic UI update: assume default role initially
      setUserRole(currentUser ? "user" : null); // Or any other suitable default

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
                setTabs([
                  <Patient />,
                  <Medicine />,
                  <Appointment />,
                  <Prescriptions />,
                  <MedicalRecord />,
                  null,
                ]);
              } else if (userData.Role === "admin") {
                setTabs([
                  <Patient />,
                  <Medicine />,
                  <Appointment />,
                  <Prescriptions />,
                  null,
                  <Account />,
                ]);
              } else {
                setTabs([
                  <Patient />,
                  <Medicine />,
                  <Appointment />,
                  <Prescriptions />,
                  null,
                  null,
                ]);
              }
              // Add more conditions for other roles if needed
            } else {
              // Handle case where user is not found in 'accounts'
              setUserRole(null); // Or some default role
            }
          }
        } else {
          setUserRole(null);
        }
      };

      fetchUserRole();
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []); // Empty dependency array ensures this runs once on mount

  const fetchMedicines = async () => {
    const querySnapshot = await getDocs(medicineCollectionRef);
    const medicinesList = querySnapshot.docs.map((doc) => doc.data());
    setMedicines(medicinesList);
  };

  const fetchPatients = async () => {
    const querySnapshot = await getDocs(patientsCollectionRef);
    const patientsList = querySnapshot.docs.map((doc) => doc.data());
    setPatients(patientsList);
  };

  const logout = async () => {
    await signOut(auth).then(() => {
      navigate("/");
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const printText = () => {
    console.log(testText);
  };

  return (
    // <div className="dashboard">
    //     <img src={profileSvg} alt="Profile" className="profile-icon" onClick={toggleSidebar} />
    //     <Sidebar accountInfo={user} additionalInfo={additionalInfo} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
    //     <div className="main-content">
    //         <h1 style={{ textAlign: 'center' }}>Dashboard</h1>
    //         {userRole && ( // Conditionally render buttons based on userRole
    //             <div className="button-grid">
    //                 <div className="button-container" onClick={async () => {
    //                     await fetchPatients();
    //                     navigate("/patients", { state: { patients } });
    //                 }}>
    //                     <div className="circle-button">
    //                         <img src={patientSvg} alt="Patients" />
    //                     </div>
    //                     <p>Patients</p>
    //                 </div>
    //                 <div className="button-container" onClick={async () => {
    //                     await fetchMedicines();
    //                     navigate("/medicine", { state: { medicines } });
    //                 }}>
    //                     <div className="circle-button">
    //                         <img src={medicineSvg} alt="Medication" />
    //                     </div>
    //                     <p>Medication</p>
    //                 </div>
    //                 <div className="button-container" onClick={() => navigate("/appointment")}>
    //                     <div className="circle-button">
    //                         <img src={appointmentSvg} alt="Appointments" />
    //                     </div>
    //                     <p>Appointments</p>
    //                 </div>
    //                 <div className="button-container" onClick={() => navigate("/prescription")}>
    //                     <div className="circle-button">
    //                         <img src={appointmentSvg} alt="Prescriptions" />
    //                     </div>
    //                     <p>Prescriptions</p>
    //                 </div>

    //                 {userRole === 'doctor' && (
    //                     <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
    //                         <div className="button-container" onClick={() => navigate("/medicalrecord")}>
    //                             <div className="circle-button">
    //                                 <img src={accountSvg} alt="Medical Record" />
    //                             </div>
    //                             <p>Medical Record</p>
    //                         </div>
    //                     </ProtectedRoute>
    //                 )}
    //                 {userRole === 'admin' && (
    //                     <ProtectedRoute userRole={userRole}> {/* Pass userRole as prop */}
    //                         <div className="button-container" onClick={() => navigate("/account")}>
    //                             <div className="circle-button">
    //                                 <img src={accountSvg} alt="Account List" />
    //                             </div>
    //                             <p>Account List</p>
    //                         </div>
    //                     </ProtectedRoute>
    //                 )}
    //                 <div className="button-container" onClick={logout}>
    //                     <div className="circle-button">
    //                         <img src={logoutSvg} alt="Logout" />
    //                     </div>
    //                     <p>Logout</p>
    //                 </div>
    //             </div>
    //         )}
    //     </div>
    //     {/* New bottom container */}
    //     <div className="bottom-container">
    //         <p>Bottom Container Content</p>
    //         <p>Testing the transcribe</p>
    //         <TextTranscribe
    //             textFunc = {setTestText}
    //         />
    //     </div>
    //     <button onClick={printText}>Test</button>
    // </div>

    <div
      className="dashboard"
      style={{
        overflowX: "hidden",
      }}
    >
      <img
        src={profileSvg}
        alt="Profile"
        className="profile-icon"
        onClick={toggleSidebar}
      />
      <Sidebar
        accountInfo={user}
        additionalInfo={additionalInfo}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      <div className="main-content">
        <h1
          style={{
            textAlign: "center",
            zIndex: 1,
          }}
        >
          Dashboard
        </h1>
        {userRole && ( // Conditionally render buttons based on userRole
          <div
            className="button-grid"
            style={{
              maxWidth: buttonGridWidth,
            }}
          >
            <div
              className="button-container"
              onClick={() => {
                setActiveTab(0);
              }}
            >
              <div className="circle-button">
                <img src={patientSvg} alt="Patients" />
              </div>
              <p>Patients</p>
            </div>
            <div
              className="button-container"
              onClick={() => {
                setActiveTab(1);
              }}
            >
              <div className="circle-button">
                <img src={medicineSvg} alt="Medication" />
              </div>
              <p>Medication</p>
            </div>
            <div className="button-container" onClick={() => setActiveTab(2)}>
              <div className="circle-button">
                <img src={appointmentSvg} alt="Appointments" />
              </div>
              <p>Appointments</p>
            </div>
            <div className="button-container" onClick={() => setActiveTab(3)}>
              <div className="circle-button">
                <img src={appointmentSvg} alt="Prescriptions" />
              </div>
              <p>Prescriptions</p>
            </div>

            {userRole === "doctor" && (
              <ProtectedRoute userRole={userRole}>
                {" "}
                {/* Pass userRole as prop */}
                <div
                  className="button-container"
                  onClick={() => setActiveTab(4)}
                >
                  <div className="circle-button">
                    <img src={accountSvg} alt="Medical Record" />
                  </div>
                  <p>Medical Record</p>
                </div>
              </ProtectedRoute>
            )}
            {userRole === "admin" && (
              <ProtectedRoute userRole={userRole}>
                {" "}
                {/* Pass userRole as prop */}
                <div
                  className="button-container"
                  onClick={() => setActiveTab(5)}
                >
                  <div className="circle-button">
                    <img src={accountSvg} alt="Account List" />
                  </div>
                  <p>Account List</p>
                </div>
              </ProtectedRoute>
            )}
            <div className="button-container" onClick={logout}>
              <div className="circle-button">
                <img src={logoutSvg} alt="Logout" />
              </div>
              <p>Logout</p>
            </div>
          </div>
        )}
        {/* Add woman.png image */}
        <div
          className="image-container"
          style={{
            position: "absolute",
            right: 0,
            top: dashboardHeight - 245,
            zIndex: 0,
          }}
        >
          <img src={require("../images/woman.png")} alt="Woman" />
        </div>
      </div>
      {/* New bottom container */}

      <div
        className="bottom-container"
        style={{
          height: windowHeight - dashboardHeight,
          zIndex: 2,
        }}
      >
        {tabs.map((tab, index) =>
          tab !== null ? (
            <div style={{ display: activeTab == index ? "inline" : "none" }}>
              {tab}
            </div>
          ) : (
            ""
          )
        )}
      </div>
    </div>
  );
};
