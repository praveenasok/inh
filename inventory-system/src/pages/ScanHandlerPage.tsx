import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, MapPin, Smartphone, Activity } from 'lucide-react';

export default function ScanHandlerPage() {
  const { qrId } = useParams();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const payload = searchParams.get('payload') || 'Unknown Target';
  const qrName = searchParams.get('name') || 'Unknown Tag';

  useEffect(() => {
    async function logScan() {
      if (!qrId) return;

      try {
        // Detect basic device info
        const userAgent = window.navigator.userAgent;
        let os = 'Unknown';
        let browser = 'Unknown';

        if (/android/i.test(userAgent)) os = 'Android';
        else if (/iPad|iPhone|iPod/.test(userAgent)) os = 'iOS';
        else if (/Mac OS X/.test(userAgent)) os = 'macOS';
        else if (/Windows/.test(userAgent)) os = 'Windows';

        if (/Chrome/.test(userAgent)) browser = 'Chrome';
        else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
        else if (/Firefox/.test(userAgent)) browser = 'Firefox';
        else if (/Edg/.test(userAgent)) browser = 'Edge';

        // Placeholder location logic (in a real app, use Geolocation API or IP lookup)
        const mockCity = 'Chennai'; 
        const mockCountry = 'India';

        const scanData = {
          qrId,
          qrName,
          timestamp: new Date().toISOString(),
          city: mockCity,
          country: mockCountry,
          os,
          browser,
          createdAt: serverTimestamp()
        };

        // Log to Firebase
        await addDoc(collection(db, 'inv_qr_scans'), scanData);
        setStatus('success');
      } catch (err) {
        console.error('Error logging scan:', err);
        setStatus('error');
      }
    }

    logScan();
  }, [qrId, qrName]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-soft border border-gray-100 text-center space-y-6">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-gray-800">Processing Scan...</h2>
            <p className="text-sm text-gray-500">Registering this tag scan in the cloud.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
            <CheckCircle className="text-emerald-500 w-20 h-20 mx-auto" />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Scan Registered!</h2>
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl w-full text-sm font-semibold border border-emerald-100 shadow-sm text-left">
              <p className="mb-2 uppercase text-xs tracking-widest text-emerald-600 font-bold">Tag Information</p>
              <p className="font-mono text-xs break-all">{payload}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center">
                <MapPin size={16} className="text-blue-500 mb-1" />
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Location</span>
                <span className="text-xs font-semibold text-gray-800">Chennai, IN</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center">
                <Smartphone size={16} className="text-purple-500 mb-1" />
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Device</span>
                <span className="text-xs font-semibold text-gray-800">Logged</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6 max-w-xs leading-relaxed font-medium">
              This physical scan has been instantly synced to the main dashboard's Tracking Feed via Firebase. You may close this tab.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <Activity className="text-red-500 w-16 h-16 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Tracking Failed</h2>
            <p className="text-sm text-gray-500">Could not sync scan to database.</p>
          </div>
        )}

      </div>
    </div>
  );
}
