import React from 'react'
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth} from '../config/firebase-config';

//make sure cannot go anywhere here
export const Waiting =() => {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth).then(() =>{
        navigate('/');
    });
  };


  return (
    <div>
        Please Wait for the Admin assign a role for you.
        <button onClick={logout}>Log Out</button>
    </div>
  )
}
