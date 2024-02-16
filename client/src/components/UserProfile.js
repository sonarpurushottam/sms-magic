// src/components/UserProfile.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const UserProfile = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Fetch user profile data from the API
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get("/api/user/profile");
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <div>
      <h2>User Profile</h2>
      {userData && (
        <div>
          <p>Username: {userData.username}</p>
          <p>Email: {userData.email}</p>
          <p>Phone: {userData.phone}</p>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
