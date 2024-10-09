import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db, storage } from "../config/firebase-config";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import placeholderAvatar from "../images/Profile_avatar_placeholder_large.png";
import Modal from "./Modal"; // Import the modal component
import "../styles/patient.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase storage function
import { TextTranscribe } from "./TextTranscribe";

export const Patient = () => {
  const [patients, setPatients] = useState([]);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editedPatient, setEditedPatient] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [searchText, setSearchText] = useState(""); // State for search text
  const navigate = useNavigate();
  const accountsCollectionRef = collection(db, "accounts");
  const [validationErrors, setValidationErrors] = useState({});

  const [selectedImage, setSelectedImage] = useState(null);
  const [avatarURL, setAvatarURL] = useState(placeholderAvatar); // State for avatar URL

  useEffect(() => {
    const fetchPatients = async () => {
      const patientsCollectionRef = collection(db, "patients");
      const data = await getDocs(patientsCollectionRef);
      // Fetch avatar URLs after getting patient data
      const patientsWithAvatars = await Promise.all(
        data.docs.map(async (doc) => {
          const patientData = doc.data();
          let avatarURL = placeholderAvatar;
          if (patientData.avatarURL) {
            try {
              avatarURL = await getDownloadURL(
                ref(storage, patientData.avatarURL)
              );
            } catch (error) {
              console.error("Error getting avatar URL:", error);
            }
          }
          return { ...patientData, id: doc.id, avatarURL };
        })
      );
      setPatients(patientsWithAvatars);
    };

    fetchPatients();
  }, []);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const fetchUserRole = async () => {
          let userEmail = currentUser.email;
          let q = query(accountsCollectionRef, where("Gmail", "==", userEmail));
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
  }, []);

  const handleEditClick = (patient) => {
    setEditingPatientId(patient.id);
    setEditedPatient(patient);
    setAvatarURL(patient.avatarURL || placeholderAvatar); // Set the avatar URL when editing
    setIsModalOpen(true);
    setValidationErrors({}); // Clear validation errors
  };

  const handleInputChange = (target) => {
    const { name, value } = target;
    setEditedPatient((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (target) => {
    const { name, value } = target;
    setEditedPatient((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value,
      },
    }));
  };

  const handleEmergencyContactChange = (target) => {
    const { name, value } = target;
    setEditedPatient((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name.split(".")[1]]: value, // Extract the property name after the dot
      },
    }));
  };

  const handleInsuranceDetailsChange = (target) => {
    const { name, value } = target;
    setEditedPatient((prev) => ({
      ...prev,
      insurancedetails: {
        ...prev.insurancedetails,
        [name.split(".")[1]]: value,
      },
    }));
  };

  const handleSaveClick = async () => {
    const errors = {};

    let imageURL = avatarURL; // Use the existing avatar URL by default

    if (selectedImage) {
      // If a new image is selected, upload it to Firebase Storage
      const storageRef = ref(storage, `patientAvatars/${editedPatient.id}`);
      try {
        await uploadBytes(storageRef, selectedImage);
        imageURL = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error uploading image: ", error);
        // Add handle the error and display a message to the user
      }
    }

    // Name validation
    if (!editedPatient || !editedPatient.name || !editedPatient.name.trim()) {
      errors.name = "Name cannot be empty";
    } else if (!/^[a-zA-Z\s]+$/.test(editedPatient.name)) {
      errors.name = "Name cannot contain numbers or special characters";
    }

    // Address validation
    if (!editedPatient || !editedPatient.address) {
      errors.address = "Address is required";
    } else {
      if (
        !editedPatient.address.street ||
        !editedPatient.address.street.trim()
      ) {
        errors.street = "Street cannot be empty";
      }
      if (!editedPatient.address.city || !editedPatient.address.city.trim()) {
        errors.city = "City cannot be empty";
      }
      if (!editedPatient.address.state || !editedPatient.address.state.trim()) {
        errors.state = "State cannot be empty";
      }
      if (
        !editedPatient.address.zipcode ||
        !editedPatient.address.zipcode.trim()
      ) {
        errors.zipcode = "Zipcode cannot be empty";
      } else if (!/^\d{5}(-\d{4})?$/.test(editedPatient.address.zipcode)) {
        errors.zipcode = "Invalid zipcode format";
      }
    }

    // Phone validation
    if (!editedPatient || !editedPatient.phone || !editedPatient.phone.trim()) {
      errors.phone = "Phone number cannot be empty";
    } else if (!/^\d{10,15}$/.test(editedPatient.phone)) {
      errors.phone = "Invalid phone number format";
    }

    // Email validation
    if (!editedPatient || !editedPatient.email || !editedPatient.email.trim()) {
      errors.email = "Email cannot be empty";
    } else if (!/\S+@\S+\.\S+/.test(editedPatient.email)) {
      errors.email = "Invalid email format";
    }

    // Date of Birth validation
    if (
      !editedPatient ||
      !editedPatient.dateOfBirth ||
      !editedPatient.dateOfBirth.trim()
    ) {
      errors.dateOfBirth = "Date of Birth cannot be empty";
    }

    // Gender validation
    if (
      !editedPatient ||
      !editedPatient.gender ||
      !editedPatient.gender.trim()
    ) {
      errors.gender = "Gender cannot be empty";
    }

    // Insurance Provider validation
    if (
      !editedPatient ||
      !editedPatient.insurancedetails ||
      !editedPatient.insurancedetails.insuranceprovider ||
      !editedPatient.insurancedetails.insuranceprovider.trim()
    ) {
      errors.insuranceProvider = "Insurance Provider cannot be empty";
    }
    // Insurance Policy Number validation
    if (
      !editedPatient ||
      !editedPatient.insurancedetails ||
      !editedPatient.insurancedetails.policynumber ||
      !editedPatient.insurancedetails.policynumber.trim()
    ) {
      errors.insurancePolicyNumber = "Insurance Policy Number cannot be empty";
    }
    // Emergency Contact validation
    if (
      !editedPatient ||
      !editedPatient.emergencyContact ||
      !editedPatient.emergencyContact.name ||
      !editedPatient.emergencyContact.name.trim()
    ) {
      errors.emergencyContactName = "Emergency Contact Name cannot be empty";
    }
    if (
      !editedPatient.emergencyContact.phonenumber ||
      !editedPatient.emergencyContact.phonenumber.trim()
    ) {
      errors.emergencyContactPhone =
        "Emergency Contact Phone number cannot be empty";
    } else if (
      !/^\d{10,15}$/.test(editedPatient.emergencyContact.phonenumber)
    ) {
      errors.emergencyContactPhone =
        "Invalid Emergency Contact Phone number format";
    }

    if (
      !editedPatient.emergencyContact.relation ||
      !editedPatient.emergencyContact.relation.trim()
    ) {
      errors.emergencyContactRelation =
        "Emergency Contact Relation cannot be empty";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return; // Prevent saving if there are errors
    }

    if (editingPatientId === null) {
      const newDoc = await addDoc(collection(db, "patients"), {
        ...editedPatient,
        avatarURL: imageURL, // Add the avatar URL to the new patient data
      });
      setPatients((prevPatients) => [
        ...prevPatients,
        { ...editedPatient, id: newDoc.id, avatarURL: imageURL },
      ]);
    } else {
      const patientDocRef = doc(db, "patients", editingPatientId);
      await updateDoc(patientDocRef, { ...editedPatient, avatarURL: imageURL }); // Update the avatar URL

      setPatients((prevPatients) =>
        prevPatients.map((patient) =>
          patient.id === editingPatientId
            ? { ...editedPatient, avatarURL: imageURL }
            : patient
        )
      );
    }
    setIsModalOpen(false);
    setEditingPatientId(null);
    setEditedPatient({});
  };

  const handleAddNewPatientClick = () => {
    setEditingPatientId(null);
    setEditedPatient({
      name: "",
      address: { street: "", city: "", state: "", zipcode: "" },
      dateOfBirth: "",
      email: "",
      emergencyContact: { name: "", phonenumber: "", relation: "" },
      gender: "",
      insurancedetails: { insuranceprovider: "", policynumber: "" },
      medicalRecordID: [],
      avatarURL: placeholderAvatar, // Set default avatar for new patients
    });
    setAvatarURL(placeholderAvatar); // Reset avatar URL in state
    setSelectedImage(null); // Reset selected image
    setIsModalOpen(true);
    setValidationErrors({}); // Clear validation errors
  };

  const handleCancelClick = () => {
    setIsModalOpen(false);
    setEditingPatientId(null);
    setEditedPatient({});
    setValidationErrors({}); // Clear validation errors
  };

  const handleViewAppointments = (patientId) => {
    navigate("/appointment", { state: { patientId: patientId } });
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const filteredPatients = patients.filter((patient) =>
    Object.values(patient).some((value) =>
      value.toString().toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  return (
    <div>
      <h1>Patients</h1>
      <div style={{width: "90%", margin: "auto"}}>
        <TextTranscribe
          placeholder="Search patients..."
          textFunc={(t) => setSearchText(t.value)}
          text={searchText}
          isInput={true}
        />
      </div>
      <br />
      <button onClick={handleAddNewPatientClick}>Add New Patient</button>
      <br />
      <br />
      
      <div className="patient-container">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <div
              className="patient-box"
              onClick={() => handleEditClick(patient)}
              key={patient.id}
            >
              <div className="patient-text">
                <img
                  className="avatar-image"
                  src={patient.avatarURL}
                  alt="Patient Avatar"
                />
                Name: {patient.name}
                <br />
                Patient ID: {patient.id}
                <br />
                <br />
                Email: {patient.email}
              </div>
            </div>
          ))
        ) : (
          <h1>No data!</h1>
        )}
      </div>
      

      <Modal isOpen={isModalOpen} onClose={handleCancelClick}>
        <div>
          <h2>
            {editingPatientId === null ? "Add New Patient" : "Edit Patient"}
          </h2>
          {editingPatientId === null ? (
            ""
          ) : (
            <h2>Patient ID: {editedPatient.id}</h2>
          )}
          <p>
            <label htmlFor="avatar">Avatar:</label>
            <input type="file" id="avatar" onChange={handleImageChange} />
            {avatarURL && (
              <img
                src={avatarURL}
                alt="Patient Avatar"
                style={{ width: "100px", height: "100px" }}
              />
            )}
          </p>
          <p>
            Name:
            <TextTranscribe
              placeholder="Name"
              name="name"
              textFunc={handleInputChange}
              text={editedPatient.name || ""}
              isInput={true}
            />
            {validationErrors.name && (
              <span style={{ color: "red" }}>{validationErrors.name}</span>
            )}
          </p>
          <p>
            Address:
            <TextTranscribe
              placeholder="Street"
              name="street"
              textFunc={handleAddressChange}
              text={editedPatient.address?.street || ""}
              isInput={true}
            />
            {validationErrors.street && (
              <span style={{ color: "red" }}>
                {validationErrors.street}
                <br />
              </span>
            )}
            City:
            <TextTranscribe
              placeholder="City"
              name="city"
              textFunc={handleAddressChange}
              text={editedPatient.address?.city || ""}
              isInput={true}
            />
            {validationErrors.city && (
              <span style={{ color: "red" }}>
                {validationErrors.city}
                <br />
              </span>
            )}
            State:
            <TextTranscribe
              placeholder="State"
              name="state"
              textFunc={handleAddressChange}
              text={editedPatient.address?.state || ""}
              isInput={true}
            />
            {validationErrors.state && (
              <span style={{ color: "red" }}>
                {validationErrors.state}
                <br />
              </span>
            )}
            Zipcode:
            <input
              type="text"
              name="zipcode"
              value={editedPatient.address?.zipcode || ""}
              onChange={(e) => handleAddressChange(e.target)}
              placeholder="Zipcode"
              required
            />
            {validationErrors.zipcode && (
              <span style={{ color: "red" }}>{validationErrors.zipcode}</span>
            )}
          </p>
          <p>
            <label htmlFor="phone">Phone:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={editedPatient.phone || ""}
              onChange={(e) => handleInputChange(e.target)}
              placeholder="Phone"
              required
            />
            {validationErrors.phone && (
              <span style={{ color: "red" }}>{validationErrors.phone}</span>
            )}
          </p>
          <p>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={editedPatient.email || ""}
              onChange={(e) => handleInputChange(e.target)}
              placeholder="Email"
              required
            />
            {validationErrors.email && (
              <span style={{ color: "red" }}>{validationErrors.email}</span>
            )}
          </p>
          <p>
            <label htmlFor="dateOfBirth">Date of Birth:</label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={editedPatient.dateOfBirth || ""}
              onChange={(e) => handleInputChange(e.target)}
            />
            {validationErrors.dateOfBirth && (
              <span style={{ color: "red" }}>
                {validationErrors.dateOfBirth}
              </span>
            )}
          </p>
          <p>
            <label htmlFor="gender">Gender:</label>
            <select
              id="gender"
              name="gender"
              value={editedPatient.gender || ""}
              onChange={(e) => handleInputChange(e.target)}
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {validationErrors.gender && (
              <span style={{ color: "red" }}>{validationErrors.gender}</span>
            )}
          </p>
          <p>
            <label htmlFor="insurancedetails.insuranceprovider">
              Insurance Provider:
            </label>
            <TextTranscribe
              placeholder="Insurance Provider"
              name="insurancedetails.insuranceprovider"
              textFunc={handleInsuranceDetailsChange}
              text={editedPatient.insurancedetails?.insuranceprovider || ""}
              isInput={true}
            />
            {validationErrors.insuranceProvider && (
              <span style={{ color: "red" }}>
                {validationErrors.insuranceProvider}
              </span>
            )}
          </p>
          <p>
            <label htmlFor="insurancedetails.policynumber">
              Policy Number:
            </label>
            <input
              type="text"
              id="insurancedetails.policynumber"
              name="insurancedetails.policynumber"
              value={editedPatient.insurancedetails?.policynumber || ""}
              onChange={(e) => handleInsuranceDetailsChange(e.target)}
              placeholder="Policy Number"
            />
            {validationErrors.insurancePolicyNumber && (
              <span style={{ color: "red" }}>
                {validationErrors.insurancePolicyNumber}
              </span>
            )}
          </p>
          <p>
            <label htmlFor="emergencyContactName">Emergency Contact:</label>
            <TextTranscribe
              placeholder="Emergency Contact Name"
              name="emergencyContact.name"
              textFunc={handleEmergencyContactChange}
              text={editedPatient.emergencyContact?.name || ""}
              isInput={true}
            />
            {validationErrors.emergencyContactName && (
              <span style={{ color: "red" }}>
                {validationErrors.emergencyContactName}
              </span>
            )}
          </p>
          <p>
            <label htmlFor="emergencyContactPhone">
              Emergency Contact Phone:
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContact.phonenumber"
              value={editedPatient.emergencyContact?.phonenumber || ""}
              onChange={(e) => handleEmergencyContactChange(e.target)}
              placeholder="Emergency Contact Phone"
              required
            />
            {validationErrors.emergencyContactPhone && (
              <span style={{ color: "red" }}>
                {validationErrors.emergencyContactPhone}
              </span>
            )}
          </p>
          <p>
            <label htmlFor="emergencyContactRelation">
              Emergency Contact Relation:
            </label>
            <TextTranscribe
              placeholder="Emergency Contact Relation"
              name="emergencyContact.relation"
              textFunc={handleEmergencyContactChange}
              text={editedPatient.emergencyContact?.relation || ""}
              isInput={true}
            />
            {validationErrors.emergencyContactRelation && (
              <span style={{ color: "red" }}>
                {validationErrors.emergencyContactRelation}
              </span>
            )}
          </p>

          <button type="submit" onClick={handleSaveClick}>
            Save
          </button>
          <button type="button" onClick={handleCancelClick}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};
export default Patient;
