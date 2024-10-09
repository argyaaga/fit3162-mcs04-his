import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase-config';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import emailSvg from '../images/email.svg'; 
import lockSvg from '../images/lock.svg'; 
import unlockSvg from '../images/unlock.svg'; 
import "../styles/auth.css"; 
import MedicineLogo from "../images/medicine-logo.svg";

export const Auth = ({ setIsAuth }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const navigate = useNavigate();
    const accountsCollectionRef = collection(db, "accounts");
    const googleProvider = new GoogleAuthProvider();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                let userEmail = user.email;
                let q = query(accountsCollectionRef, where("Gmail", "==", userEmail));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    if (userData.Role === "") {
                        navigate("/waiting");
                    } else {
                        setIsAuth(true);
                        localStorage.setItem("isAuth", true);
                        navigate("/dashboard");
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [navigate, setIsAuth]);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        return password.length >= 8;
    };

    const signIn = async () => {
        setEmailError("");
        setPasswordError("");

        if (!validateEmail(email)) {
            setEmailError("Invalid email format.");
            return;
        }

        if (!validatePassword(password)) {
            setPasswordError("Password must be at least 8 characters long.");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password)
                .then(async (result) => {
                    let userEmail = result.user.email;
                    let q = query(accountsCollectionRef, where("Gmail", "==", userEmail));
                    const querySnapshot = await getDocs(q);
                    window.alert("LOG IN SUCCESSFULLY: " + result.user.email);
                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        if (userData.Role === "") {
                            navigate("/waiting");
                        } else {
                            setIsAuth(true);
                            localStorage.setItem("isAuth", true);
                            navigate("/dashboard");
                        }
                    } else {
                        console.error("User not found in 'accounts' collection after email/password sign-in");
                    }
                });
        } catch (err) {
            console.log(err);
        }
    };

    const googleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            let userEmail = auth.currentUser.email;
            let q = query(accountsCollectionRef, where("Gmail", "==", userEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                addDoc(accountsCollectionRef, {
                    Userid: auth.currentUser.uid,
                    Username: auth.currentUser.displayName,
                    Gmail: auth.currentUser.email,
                    Role: ""
                });
                navigate("/waiting");
            } else {
                const userData = querySnapshot.docs[0].data();
                if (userData.Role === "") {
                    navigate("/waiting");
                } else {
                    setIsAuth(true);
                    localStorage.setItem("isAuth", true);
                    navigate("/dashboard");
                }
            }

        } catch (err) {
            console.error(err);
        }
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">Sign in</h2>
                <img src={MedicineLogo} alt="Medicine Logo" className="medicine-logo" />
                <div className="input-container-auth">
                    <img src={emailSvg} alt="email icon" className="input-icon-auth" />
                    <input
                        placeholder="Email"
                        className="email"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                {emailError && <p className="error">{emailError}</p>}
                <div className="input-container-auth">
                    <img
                        src={isPasswordVisible ? unlockSvg : lockSvg}
                        alt="lock icon"
                        className="input-icon-auth"
                        onClick={togglePasswordVisibility}
                        style={{ cursor: 'pointer' }} 
                    />
                    <input
                        placeholder="Password"
                        type={isPasswordVisible ? "text" : "password"}
                        className="password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                {passwordError && <p className="error">{passwordError}</p>}
                <button className="buttonstyleauth" onClick={signIn}>Sign In</button>
                <div className="dividercontainer">
                    <div className="dividerborder" />
                        <b className="dividercontent">
                            or
                        </b>
                    <div className="dividerborder" />
                </div>
                <button className="google-signin" onClick={googleSignIn}>Sign in with Google</button> 
                <button className="sign-up" onClick={() => { navigate("/SignUp") }}>New? Sign up</button>
            </div>
        </div>
    );
};
