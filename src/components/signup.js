import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase-config';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import "../styles/signup.css";
import MedicineLogo from "../images/medicine-logo.svg";

export const Register = () => {
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [usernameSuggestions, setUsernameSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const accountsCollectionRef = collection(db, "accounts");
    const navigate = useNavigate();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        return password.length >= 8;
    };

    const signUp = async () => {
        setEmailError("");
        setPasswordError("");      
        setUsernameError("");

        try {
            
            if (!validateEmail(registerEmail)) {
                setEmailError("Invalid email format.");
                return;
            }

            const q = query(accountsCollectionRef, where("Username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty || username == '') {
                const existingUsernames = querySnapshot.docs.map(doc => doc.data().Username);
                const suggestions = generateUsernameSuggestions(username, existingUsernames);
                setUsernameSuggestions(suggestions);
                setShowSuggestions(true);
                if (!querySnapshot.empty){
                    setUsernameError("Username is used. Please use a new username.")
                } else {
                    setUsernameError("Username is incorrect. Please use a valid username.")
                }
            } else {
                if (!validatePassword(registerPassword)) {
                    setPasswordError("Password must be at least 8 characters long.");
                    return;
                }
        
                if (registerPassword !== registerConfirmPassword) {
                    setPasswordError("Passwords do not match!");
                    return;
                }
                
                await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
                await addDoc(accountsCollectionRef, {
                    Userid: auth.currentUser.uid,
                    Username: username,
                    Gmail: registerEmail,
                    Role: ""
                });
                alert("SignUp SUCCESFULLY, WELCOME " + auth.currentUser.email + " Proceed to the login.");
                navigate('/');
            }

            if (!validatePassword(registerPassword)) {
                setPasswordError("Password must be at least 8 characters long.");
                return;
            }
    
            if (registerPassword !== registerConfirmPassword) {
                setPasswordError("Passwords do not match!");
                return;
            }
        } catch (err) {
            console.log(err.message);
        }
    };

    const handleSuggestionClick = async (suggestedUsername) => {
        const q = query(accountsCollectionRef, where("Username", "==", suggestedUsername));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setUsername(suggestedUsername);
            setShowSuggestions(false);
        } else {
            alert("This suggested username is also taken. Please choose another one.");
            const existingUsernames = querySnapshot.docs.map(doc => doc.data().Username);
            const suggestions = generateUsernameSuggestions(username, existingUsernames);
            setUsernameSuggestions(suggestions);
        }
    };

    const generateUsernameSuggestions = (baseUsername, existingUsernames) => {
        const variations = [
            baseUsername + Math.floor(Math.random() * 1000),
            baseUsername + "_new",
            baseUsername + "_2",
        ];
        return variations.filter(suggestion => !existingUsernames.includes(suggestion));
    };

    return (
        <div className='centered'>
            <div className='input-container'>
                <h1 className='header'>Sign Up</h1>
                <img src={MedicineLogo} alt="Medicine Logo" className="medicine-logo" />
                <input
                    required
                    placeholder="Email"
                    onChange={(e) => setRegisterEmail(e.target.value)}
                />
                {emailError && <p className="error">{emailError}</p>}
                <input
                    required
                    placeholder="Username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        setShowSuggestions(false);
                    }}
                />
                {showSuggestions && (
                    <div className="suggestion-box">
                        {usernameSuggestions.map((suggestion, index) => (
                            <div key={index} onClick={() => handleSuggestionClick(suggestion)}>
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
                {usernameError && <p className="error">{usernameError}</p>}
                <input
                    required
                    placeholder="Password"
                    type="password"
                    onChange={(e) => setRegisterPassword(e.target.value)}
                />
                <input
                    required
                    placeholder="Confirm Password"
                    type="password"
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                />
                {passwordError && <p className="error">{passwordError}</p>}
                <button className='buttonstyle' onClick={signUp}>Sign Up</button>
                <button className='return-button' onClick={() => navigate("/")}>Return to Log In</button>
            </div>
        </div>
    );
};
