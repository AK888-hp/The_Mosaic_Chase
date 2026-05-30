import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function StorylineIntro({ teamState }) {
  const navigate = useNavigate();

  useEffect(() => {
    // If they aren't logged in, redirect them back to the landing page
    if (!teamState && !localStorage.getItem('teamCode')) {
      navigate('/');
    }
  }, [teamState, navigate]);

  const handleProceed = () => {
    const role = localStorage.getItem('playerRole');
    if (role === 'player1') {
      navigate('/realm/tech');
    } else if (role === 'player2') {
      navigate('/realm/aptitude');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="wood-card" style={{ width: '90%', maxWidth: '800px', margin: '40px auto', textAlign: 'justify', lineHeight: '1.8' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1.5rem' }}>The Scattered Nexus</h2>
      
      <div style={{ fontSize: '1.1rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <p>
          For centuries, the <strong>Nexus Mosaic</strong>—a legendary cosmic artifact—maintained the perfect balance between advanced technology and human resourcefulness. But an unexpected system anomaly has shattered the Mosaic into 36 glowing fragments, casting them across two deeply isolated, completely disconnected parallel dimensions: the <strong>Cybernetic Grid</strong> and the <strong>Survival Outpost</strong>.
        </p>

        <p>
          As elite "Architects," your team of two has been deployed into these separate realities to recover the fragments. Both players operate simultaneously at their own pace, entirely independent of what the other is doing. Neither realm affects the mechanics of the other.
        </p>

        <p>
          Each realm holds exactly 18 pieces of the puzzle. You must collect as many pieces as you can. Once time runs out, the fragments must be synced to a single device, where both players race against the clock to rebuild the Nexus Mosaic and restore order.
        </p>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={handleProceed} style={{ padding: '15px 30px', fontSize: '1.2rem' }}>
          Proceed to Your Realm
        </button>
      </div>
    </div>
  );
}

export default StorylineIntro;
