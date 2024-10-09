import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  where,
  query,
} from "firebase/firestore";
import { auth, db, storage } from "../config/firebase-config";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal"; // Import the modal component
import placeholderImage from "../images/Profile_avatar_placeholder_large.png";
import "../styles/medicine.css"; // Import the CSS file
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase storage functions
import { TextTranscribe } from "./TextTranscribe";
import { onAuthStateChanged } from "firebase/auth";

export const Medicine = () => {
  const [medicines, setMedicines] = useState([]);
  const [editingMedicineId, setEditingMedicineId] = useState(null);
  const [editedMedicine, setEditedMedicine] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState(""); // State for search text
  const navigate = useNavigate();
  const [user, setUser] = useState({});

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageURL, setImageURL] = useState(placeholderImage); // State to store image URL
  const [validationErrors, setValidationErrors] = useState({}); // State to store validation errors
  const [userRole, setUserRole] = useState(null);
  const accountsCollectionRef = collection(db, "accounts");

  useEffect(() => {
    const fetchMedicines = async () => {
      const medicinesCollectionRef = collection(db, "medicines");
      const data = await getDocs(medicinesCollectionRef);
      // Fetch image URLs after getting medicine data
      const medicinesWithImages = await Promise.all(
        data.docs.map(async (doc) => {
          const medicineData = doc.data();
          let imageURL = placeholderImage;
          if (medicineData.imageURL) {
            try {
              imageURL = await getDownloadURL(
                ref(storage, medicineData.imageURL)
              );
            } catch (error) {
              console.error("Error getting image URL:", error);
            }
          }
          return { ...medicineData, id: doc.id, imageURL };
        })
      );
      setMedicines(medicinesWithImages);
    };

    fetchMedicines();
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

  const handleEditClick = (medicine) => {
    if (medicine.disabled && userRole !== "admin") {
      return; // Prevent editing if the medicine is disabled and user is not admin
    }
    setEditingMedicineId(medicine.id);
    setEditedMedicine(medicine);
    setImageURL(medicine.imageURL || placeholderImage); // Set the image URL when editing
    setIsModalOpen(true);
    setValidationErrors({}); // Clear validation errors
  };

  const handleInputChange = (target) => {
    const { name, value } = target;
    if (name === "quantity" && value < 0) {
      return; // Prevent quantity from going below 0
    }
    setEditedMedicine((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveClick = async () => {
    const errors = {};

    // Name validation
    if (
      !editedMedicine ||
      !editedMedicine.name ||
      !editedMedicine.name.trim()
    ) {
      errors.name = "Name cannot be empty";
    } else if (!/^[a-zA-Z\s]+$/.test(editedMedicine.name)) {
      errors.name = "Name cannot contain numbers or special characters";
    }

    // Description validation
    if (
      !editedMedicine ||
      !editedMedicine.description ||
      !editedMedicine.description.trim()
    ) {
      errors.description = "Description cannot be empty";
    }

    // Edited By validation
    if (
      !editedMedicine ||
      !editedMedicine.editedBy ||
      !editedMedicine.editedBy.trim()
    ) {
      errors.editedBy = "Edited By cannot be empty";
    }

    // Edited When validation
    if (
      !editedMedicine ||
      !editedMedicine.editedWhen ||
      !editedMedicine.editedWhen.trim()
    ) {
      errors.editedWhen = "Edited When cannot be empty";
    }

    // Quantity validation
    if (editedMedicine.quantity == null || editedMedicine.quantity < 0) {
      errors.quantity = "Quantity cannot be less than 0";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return; // Prevent saving if there are errors
    }

    let imageURLToSave = imageURL; // Use the current image URL by default

    if (selectedImage) {
      // If a new image is selected, upload it to Firebase Storage
      const storageRef = ref(storage, `medicineImages/${editedMedicine.id}`);
      try {
        await uploadBytes(storageRef, selectedImage);
        imageURLToSave = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error uploading image: ", error);
        // You might want to handle the error and display a message to the user
      }
    }

    if (editingMedicineId === null) {
      const newDoc = await addDoc(collection(db, "medicines"), {
        ...editedMedicine,
        imageURL: imageURLToSave, // Add the image URL to the new medicine data
      });
      setMedicines((prevMedicines) => [
        ...prevMedicines,
        { ...editedMedicine, id: newDoc.id, imageURL: imageURLToSave },
      ]);
    } else {
      const medicineDocRef = doc(db, "medicines", editingMedicineId);
      await updateDoc(medicineDocRef, {
        ...editedMedicine,
        imageURL: imageURLToSave,
      }); // Update the image URL

      setMedicines((prevMedicines) =>
        prevMedicines.map((medicine) =>
          medicine.id === editingMedicineId
            ? {
                ...editedMedicine,
                id: editingMedicineId,
                imageURL: imageURLToSave,
              }
            : medicine
        )
      );
    }

    // Close the modal and reset the state
    setIsModalOpen(false);
    setEditingMedicineId(null);
    setEditedMedicine({});
    setValidationErrors({}); // Clear validation errors
  };

  const handleAddNewMedicineClick = () => {
    setEditingMedicineId(null);
    setEditedMedicine({
      name: "",
      description: "",
      editedBy: "",
      editedWhen: "",
      quantity: 0, // Initialize the quantity field
      disabled: false, // Initialize the disabled field
      imageURL: placeholderImage, // Set default image for new medicines
    });
    setImageURL(placeholderImage); // Reset image URL in state
    setSelectedImage(null); // Reset selected image
    setIsModalOpen(true);
    setValidationErrors({}); // Clear validation errors
  };

  const handleCancelClick = () => {
    setIsModalOpen(false);
    setEditingMedicineId(null);
    setEditedMedicine({});
    setValidationErrors({}); // Clear validation errors
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const filteredMedicines = medicines.filter((medicine) =>
    Object.values(medicine).some((value) =>
      value.toString().toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleToggleDisabled = () => {
    setEditedMedicine((prev) => ({
      ...prev,
      disabled: !prev.disabled,
    }));
  };

  return (
    <div>
      <h1>Medicines</h1>
      <div style={{width: "90%", margin: "auto"}}>
        <TextTranscribe
          placeholder="Search medicines..."
          textFunc={(t) => setSearchText(t.value)}
          text={searchText}
          isInput={true}
        />
      </div>
      <br></br>
      <button onClick={handleAddNewMedicineClick}>Add New Medicine</button>
      <br></br>
      <br></br>
      <div className="medicine-container">
        {filteredMedicines.length > 0 ? (
          filteredMedicines.map((medicine) => (
            <div
              className={`medicine-box ${medicine.disabled ? "disabled" : ""}`}
              key={medicine.id}
              onClick={() => handleEditClick(medicine)}
            >
              <img
                className="medicine-image"
                src={medicine.imageURL}
                alt="Medicine"
              />
              <div className="medicine-text">
                Name: {medicine.name}
                <br />
                Description: {medicine.description}
              </div>
            </div>
          ))
        ) : (
          <h1>No data!</h1>
        )}
      </div>

      <br />

      <Modal isOpen={isModalOpen} onClose={handleCancelClick}>
        <div>
          <h2>
            {editingMedicineId === null ? "Add New Medicine" : "Edit Medicine"}
          </h2>
          <p>
            <label htmlFor="medicineImage">Image:</label>
            <input
              type="file"
              id="medicineImage"
              onChange={handleImageChange}
            />
            {imageURL && (
              <img
                src={imageURL}
                alt="Medicine"
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
              text={editedMedicine.name || ""}
              disabled={editedMedicine.disabled && userRole !== "admin"}
              isInput={true}
            />
            {validationErrors.name && (
              <span style={{ color: "red" }}>{validationErrors.name}</span>
            )}
          </p>
          <p>
            Description:
            <TextTranscribe
              placeholder="Description"
              name="description"
              textFunc={handleInputChange}
              text={editedMedicine.description || ""}
              disabled={editedMedicine.disabled && userRole !== "admin"}
            />
            {validationErrors.description && (
              <span style={{ color: "red" }}>
                {validationErrors.description}
              </span>
            )}
          </p>
          <p>
            Edited By:
            <TextTranscribe
              placeholder="Edited By"
              name="editedBy"
              textFunc={handleInputChange}
              text={editedMedicine.editedBy || ""}
              disabled={editedMedicine.disabled && userRole !== "admin"}
              isInput={true}
            />
            {validationErrors.editedBy && (
              <span style={{ color: "red" }}>{validationErrors.editedBy}</span>
            )}
          </p>
          <p>
            Edited When:
            <TextTranscribe
              placeholder="Edited When"
              name="editedWhen"
              textFunc={handleInputChange}
              text={editedMedicine.editedWhen || ""}
              disabled={editedMedicine.disabled && userRole !== "admin"}
              isInput={true}
            />
            {validationErrors.editedWhen && (
              <span style={{ color: "red" }}>
                {validationErrors.editedWhen}
              </span>
            )}
          </p>
          <p>
            Quantity:
            <input
              type="number"
              name="quantity"
              value={editedMedicine.quantity || ""}
              onChange={(e) => handleInputChange(e.target)}
              placeholder="Quantity"
              min="0" // Ensure the input field does not allow values below 0
              disabled={editedMedicine.disabled && userRole !== "admin"} // Disable input if medicine is disabled and user is not admin
            />
            {validationErrors.quantity && (
              <span style={{ color: "red" }}>{validationErrors.quantity}</span>
            )}
          </p>
          {userRole === "admin" && (
            <p>
              <span className="label">Disabled:</span>
              <label className="switch">
                <input
                  type="checkbox"
                  name="disabled"
                  checked={editedMedicine.disabled}
                  onChange={handleToggleDisabled}
                />
                <span className="slider round"></span>
              </label>
            </p>
          )}
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

export default Medicine;
