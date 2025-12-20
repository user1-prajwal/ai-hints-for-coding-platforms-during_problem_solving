
import React, { useState } from "react";
import ChatBox from "../material/chatbox";
import Button from "../components/user-inter/button";

const ContentApp: React.FC = () => {
  const [chatVisible, setChatVisible] = useState(false);

  return (
    // <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }}>
      <div style={{ width: 400, height: 500, backgroundColor: '#f3f4f6', borderRadius: 8, display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>

      <Button onClick={() => setChatVisible((prev) => !prev)}>
        {chatVisible ? "❌ Close" : "💡 ThinkBuddy"}
      </Button>

      {chatVisible && (
        <div className="mt-2">
          <ChatBox
            visible={chatVisible}
            problemStatement="Problem statement goes here"
          />
        </div>
      )}
    </div>
  );
};

export default ContentApp;
