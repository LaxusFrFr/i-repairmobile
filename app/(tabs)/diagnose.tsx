import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { auth, db } from '../../firebase/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import { diagnoseStyles } from '../../styles/diagnose.style';
import { Picker } from '@react-native-picker/picker';

// AI API configuration - Multiple options
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// USD to PHP conversion (using approximate current rate)
const USD_TO_PHP_RATE = 56.5; // Approximate rate, you can update this or fetch from API

// Function to get current USD to PHP exchange rate
const getCurrentExchangeRate = async (): Promise<number> => {
  try {
    // You can use a free exchange rate API like exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    return data.rates.PHP || USD_TO_PHP_RATE;
  } catch (error) {
    console.log('Failed to fetch exchange rate, using default:', error);
    return USD_TO_PHP_RATE; // Fallback to default rate
  }
};

// Appliance categories with their issues and pricing
const applianceData = {
  'Television': {
    issues: [
      { name: 'No display/black screen', price: 2500 },
      { name: 'No sound', price: 800 },
      { name: 'Remote not working', price: 300 },
      { name: 'Poor picture quality', price: 1200 },
      { name: 'Power issues', price: 600 },
      { name: 'Others (please specify)', price: 0, isOther: true }
    ]
  },
  'Electric Fan': {
    issues: [
      { name: 'Not spinning', price: 400 },
      { name: 'Making noise', price: 200 },
      { name: 'Speed control not working', price: 300 },
      { name: 'Oscillation not working', price: 250 },
      { name: 'Power issues', price: 150 },
      { name: 'Others (please specify)', price: 0, isOther: true }
    ]
  },
  'Air Conditioner': {
    issues: [
      { name: 'Not cooling', price: 3500 },
      { name: 'Making noise', price: 800 },
      { name: 'Water leaking', price: 600 },
      { name: 'Remote not working', price: 400 },
      { name: 'Power issues', price: 500 },
      { name: 'Others (please specify)', price: 0, isOther: true }
    ]
  },
  'Refrigerator': {
    issues: [
      { name: 'Not cooling', price: 2800 },
      { name: 'Making noise', price: 600 },
      { name: 'Water leaking', price: 400 },
      { name: 'Ice maker not working', price: 800 },
      { name: 'Power issues', price: 500 },
      { name: 'Others (please specify)', price: 0, isOther: true }
    ]
  },
  'Washing Machine': {
    issues: [
      { name: 'Not spinning', price: 1200 },
      { name: 'Not draining', price: 800 },
      { name: 'Making noise', price: 600 },
      { name: 'Water not filling', price: 700 },
      { name: 'Power issues', price: 500 },
      { name: 'Others (please specify)', price: 0, isOther: true }
    ]
  }
};

// Validate custom issue text (relaxed for AI processing)
const validateCustomIssue = (text: string) => {
  const trimmedText = text.trim();
  
  // Check if text is too short
  if (trimmedText.length < 2) {
    return { isValid: false, reason: 'Please provide a description (at least 2 characters)' };
  }
  
  // Check if text is too long
  if (trimmedText.length > 1000) {
    return { isValid: false, reason: 'Description is too long. Please keep it under 1000 characters' };
  }
  
  // Only check for extreme gibberish (very relaxed)
  const extremeGibberishPattern = /(.)\1{8,}/; // Same character repeated 8+ times
  if (extremeGibberishPattern.test(trimmedText)) {
    return { isValid: false, reason: 'Please provide a more meaningful description' };
  }
  
  // Check for excessive special characters (more lenient)
  const specialCharCount = (trimmedText.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > trimmedText.length * 0.5) {
    return { isValid: false, reason: 'Please use more readable text to describe the issue' };
  }
  
  // Only check for obvious keyboard mashing
  const obviousKeyboardMash = /^(asdfghjkl|qwertyuiop|zxcvbnm|qazwsxedc|rfvtgbyhn|ujmikolp;|qwertyuiopasdfghjklzxcvbnm)$/i;
  if (obviousKeyboardMash.test(trimmedText)) {
    return { isValid: false, reason: 'Please provide a meaningful description of the issue' };
  }
  
  return { isValid: true, reason: '' };
};

// Rate limiting mechanism
let lastApiCall = 0;
let rateLimitCount = 0;
const API_CALL_DELAY = 10000; // 10 seconds between calls (for free tier)
const MAX_RATE_LIMIT_ATTEMPTS = 1; // Skip AI after 1 rate limit hit

// Reset rate limit counter after 10 minutes (for free tier)
setInterval(() => {
  rateLimitCount = 0;
}, 10 * 60 * 1000);

// API Key validation function
const validateApiKeys = () => {
  console.log('=== API Key Validation ===');
  console.log('Groq API Key:', GROQ_API_KEY ? `${GROQ_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('Gemini API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('Groq URL:', GROQ_API_URL);
  console.log('Gemini URL:', GEMINI_API_URL);
  console.log('========================');
};

// Test Groq API key validity
const testGroqApiKey = async (setStatus?: (status: string) => void) => {
  try {
    console.log('Testing Groq API key...');
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (response.ok) {
      console.log('✅ Groq API key is valid!');
      setStatus?.('✅ Groq API key is valid!');
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ Groq API key validation failed:', response.status, errorData);
      setStatus?.('❌ Groq API key validation failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Groq API key test error:', error);
    setStatus?.('❌ Groq API key test error');
    return false;
  }
};

// Test Gemini API key validity
const testGeminiApiKey = async (setStatus?: (status: string) => void) => {
  try {
    console.log('Testing Gemini API key...');
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, this is a test.'
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      })
    });

    if (response.ok) {
      console.log('✅ Gemini API key is valid!');
      setStatus?.('✅ AI Services Available');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Gemini API key test failed:', response.status, errorText);
      setStatus?.('⚠️ Using Smart Fallback');
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API key test error:', error);
    setStatus?.('⚠️ Using Smart Fallback');
    return false;
  }
};

// Instant diagnosis for predefined issues (AI-quality responses)
const generateInstantDiagnosis = (category: string, issue: string, brand?: string, model?: string): string => {
  const modelInfo = model ? ` (${model})` : '';
  const brandInfo = brand ? ` ${brand}` : '';
  
  // Comprehensive diagnosis patterns for predefined issues
  const instantDiagnoses: { [key: string]: { [key: string]: string } } = {
    'Television': {
      'No display/black screen': `Your${brandInfo} TV${modelInfo} is experiencing a backlight failure, which is the most common cause of black screen issues. This typically occurs due to aging LED strips, power supply problems, or inverter board malfunctions. The backlight system provides illumination to the display panel, and when it fails, the screen appears completely black even though the TV may still be receiving power and audio signals. The most effective solution is to replace the LED backlight strips and check the power supply connections. This repair requires professional disassembly of the TV and specialized tools to safely handle the LED components.`,
      
      'No sound': `Your${brandInfo} TV${modelInfo} has an audio system failure that could stem from several components. The most likely causes include speaker damage from moisture or physical impact, audio board malfunctions due to power surges, or software issues affecting the sound processing. The audio system consists of speakers, audio processing chips, and amplifier circuits that work together to produce sound. The most effective solution is to first check the audio settings and perform a factory reset, then test with external speakers to isolate whether the issue is with the internal speakers or the audio processing system. If the problem persists, professional repair of the audio board or speaker replacement will be necessary.`,
      
      'Remote not working': `Your${brandInfo} TV${modelInfo} remote control issue is typically caused by infrared sensor problems, battery depletion, or signal interference. The IR receiver on the TV may be blocked by dust, damaged by physical impact, or experiencing electrical issues. Remote controls use infrared light to communicate with the TV's receiver, and any obstruction or malfunction in this system will prevent proper operation. The most effective solution is to first replace the remote batteries and clean the IR sensor on the TV with a soft cloth. If the issue persists, test with a universal remote or smartphone app to determine if the problem is with the remote or the TV's receiver. Professional repair may be needed to replace the IR receiver module.`,
      
      'Screen flickering': `Your${brandInfo} TV${modelInfo} is experiencing display flickering, which typically indicates power supply instability, backlight issues, or panel problems. Flickering occurs when the display components receive inconsistent power or when there are loose connections in the video processing chain. This can be caused by aging capacitors in the power supply, loose ribbon cable connections, or failing backlight drivers. The most effective solution is to check all cable connections and perform a power cycle reset. If flickering persists, the power supply board may need capacitor replacement or the backlight system may require professional repair. In severe cases, the display panel itself may need replacement.`,
      
      'Poor picture quality': `Your${brandInfo} TV${modelInfo} picture quality issues are often caused by panel degradation, signal processing problems, or cable connection issues. Over time, display panels can develop dead pixels, color uniformity problems, or brightness inconsistencies. The video processing system may also experience issues with color calibration, contrast adjustment, or resolution scaling. The most effective solution is to first check all input cables and connections, then access the TV's picture settings to reset to factory defaults. If problems persist, professional calibration of the display settings or replacement of the video processing board may be necessary. In cases of severe panel damage, display replacement is the only solution.`
    },
    'Electric Fan': {
      'Not spinning': `Your${brandInfo} electric fan${modelInfo} motor failure is typically caused by worn bearings, capacitor problems, or electrical issues. The fan motor requires proper lubrication and electrical connections to rotate the blades. When bearings wear out, the motor cannot turn smoothly, and when capacitors fail, the motor lacks the starting torque needed to begin rotation. The most effective solution is to first check the power supply and ensure the fan is plugged in properly. If the motor still won't start, professional inspection of the bearings, capacitor, and motor windings is necessary. Motor replacement or bearing repair may be required.`,
      
      'Making noise': `Your${brandInfo} electric fan${modelInfo} noise issues are usually caused by worn bearings, loose components, or motor problems. The fan contains several moving parts including the motor, bearings, and blade assembly that can develop issues over time. Grinding, squealing, or rattling sounds typically indicate bearing wear, loose mounting hardware, or motor problems. The most effective solution is to first check for loose screws and ensure the fan is properly mounted. If noises persist, professional inspection of the bearings, motor, and mechanical components may be necessary. Bearing replacement or motor repair may be required.`,
      
      'Speed control not working': `Your${brandInfo} electric fan${modelInfo} speed control problems are typically due to faulty switches, capacitor issues, or electrical problems. The speed control system uses switches and capacitors to regulate motor speed, and when these components fail, the fan cannot change speeds or may only work on certain settings. The most effective solution is to first check the speed control switch for proper operation and ensure all connections are secure. If the speed control still doesn't work, professional inspection of the switch, capacitor, and electrical system may be necessary. Switch replacement or capacitor repair may be required.`,
      
      'Oscillation not working': `Your${brandInfo} electric fan${modelInfo} oscillation failure is usually caused by mechanical problems in the oscillation mechanism. The oscillation system uses gears and mechanical components to rotate the fan head, and when these parts wear out or become damaged, the fan cannot oscillate properly. The most effective solution is to first check if the oscillation lock is engaged and ensure the fan head can move freely. If oscillation still doesn't work, professional inspection of the oscillation mechanism, gears, and mechanical components may be necessary. Gear replacement or mechanism repair may be required.`,
      
      'Power issues': `Your${brandInfo} electric fan${modelInfo} power problems are typically caused by electrical issues, cord damage, or switch malfunctions. The electrical system includes the power cord, switch, and internal wiring that must all function properly for the fan to receive power. When these components fail, the fan cannot turn on or may have intermittent power issues. The most effective solution is to first check the power cord for damage and ensure the switch is working properly. If power issues persist, professional inspection of the electrical system, cord replacement, or switch repair may be necessary.`
    },
    'Air Conditioner': {
      'Not cooling': `Your${brandInfo} air conditioner${modelInfo} cooling failure is typically caused by refrigerant leaks, compressor issues, or blocked filters. The cooling system relies on refrigerant circulation through the compressor, condenser, and evaporator coils to remove heat from the air. When refrigerant levels are low due to leaks, the system cannot effectively cool the air. Blocked air filters restrict airflow, reducing cooling efficiency and potentially causing the system to overheat. The most effective solution is to first check and replace air filters, then inspect for visible refrigerant leaks around connections. Professional service is required to test refrigerant levels, repair leaks, and recharge the system if necessary.`,
      
      'Not turning on': `Your${brandInfo} air conditioner${modelInfo} power issues are usually related to electrical problems, thermostat malfunctions, or control board failures. The electrical system includes circuit breakers, fuses, wiring connections, and control components that must all function properly for the unit to start. Power surges, loose connections, or component failures can prevent the system from receiving or processing the start command. The most effective solution is to first check the circuit breaker and ensure the thermostat is set correctly. If the unit still won't start, professional diagnosis of the electrical system, thermostat replacement, or control board repair may be necessary.`,
      
      'Making strange noises': `Your${brandInfo} air conditioner${modelInfo} unusual sounds often indicate motor problems, fan issues, or loose components. The system contains multiple moving parts including the compressor, fan motors, and blower assemblies that can develop mechanical issues over time. Grinding, squealing, or rattling noises typically indicate bearing wear, belt problems, or loose mounting hardware. The most effective solution is to first turn off the unit and check for loose panels or debris around the outdoor unit. Professional maintenance including motor lubrication, belt replacement, or component tightening may be required to resolve persistent noise issues.`,
      
      'Water leaking': `Your${brandInfo} air conditioner${modelInfo} water leakage is typically caused by clogged drain lines, improper installation, or condensation issues. Air conditioners produce condensation as they cool and dehumidify the air, and this water must be properly drained away from the unit. Clogged drain lines prevent water from flowing away, causing it to back up and leak. The most effective solution is to check and clean the drain line, ensuring it's properly sloped and free of obstructions. If leaks persist, professional inspection of the drain system and proper installation adjustments may be necessary.`,
      
      'Remote not working': `Your${brandInfo} air conditioner${modelInfo} remote control problems are usually due to signal issues, battery problems, or receiver malfunctions. The remote uses infrared or radio frequency signals to communicate with the unit's control system. Signal interference, low batteries, or damaged receivers can prevent proper communication. The most effective solution is to first replace the remote batteries and ensure the remote is pointed directly at the unit's receiver. If the problem persists, test with a universal remote or check if the unit responds to manual controls. Professional repair of the receiver module may be necessary.`
    },
    'Refrigerator': {
      'Not cooling': `Your${brandInfo} refrigerator${modelInfo} cooling failure is typically caused by compressor issues, refrigerant leaks, or thermostat problems. The cooling system uses a compressor to circulate refrigerant through the evaporator and condenser coils, creating the cooling effect. When the compressor fails, refrigerant leaks, or the thermostat malfunctions, the refrigerator cannot maintain proper temperatures. The most effective solution is to first check the thermostat settings and ensure the unit is properly plugged in. If cooling issues persist, professional diagnosis of the compressor, refrigerant system, and thermostat is necessary. Compressor replacement or refrigerant system repair may be required.`,
      
      'Making loud noises': `Your${brandInfo} refrigerator${modelInfo} loud noises often indicate motor problems, fan issues, or compressor malfunctions. The refrigerator contains several mechanical components including the compressor, evaporator fan, and condenser fan that can develop issues over time. Grinding, buzzing, or rattling sounds typically indicate bearing wear, loose components, or compressor problems. The most effective solution is to first check for loose items inside the refrigerator and ensure the unit is level. If noises persist, professional inspection of the compressor, fan motors, and mechanical components may be necessary. Motor replacement or compressor repair may be required.`,
      
      'Water leaking': `Your${brandInfo} refrigerator${modelInfo} water leakage is usually caused by blocked drain lines, door seal issues, or defrost system problems. Refrigerators produce condensation that must be properly drained, and damaged door seals can allow warm air to enter, causing excessive condensation. The defrost system can also malfunction, causing ice buildup that melts and leaks. The most effective solution is to first check and clean the drain line at the bottom of the refrigerator, then inspect door seals for damage or gaps. If leaks persist, professional repair of the defrost system or door seal replacement may be necessary.`,
      
      'Ice maker not working': `Your${brandInfo} refrigerator${modelInfo} ice maker failure is typically due to water supply issues, mechanical problems, or electrical malfunctions. The ice maker requires a steady water supply, proper temperature conditions, and functioning mechanical components to produce ice. Water line blockages, frozen water lines, or mechanical component failures can prevent ice production. The most effective solution is to first check the water supply line and ensure it's not frozen or blocked. If the ice maker still doesn't work, professional inspection of the water system, mechanical components, and electrical connections may be necessary.`,
      
      'Door not sealing': `Your${brandInfo} refrigerator${modelInfo} door seal problems are usually caused by worn gaskets, misalignment, or damage. The door seal (gasket) creates an airtight seal that prevents warm air from entering and cold air from escaping. When the seal is damaged, worn, or misaligned, the refrigerator must work harder to maintain temperature, leading to energy waste and potential cooling issues. The most effective solution is to first clean the door seal and check for visible damage or gaps. If the seal is damaged or misaligned, professional replacement or adjustment of the door seal may be necessary.`
    },
    'Washing Machine': {
      'Not spinning': `Your${brandInfo} washing machine${modelInfo} spin cycle failure is typically caused by motor problems, belt issues, or control board malfunctions. The spin cycle requires the motor to rotate the drum at high speed to remove water from clothes. When the motor fails, the drive belt breaks, or the control board malfunctions, the machine cannot complete the spin cycle. The most effective solution is to first check if the machine is overloaded and redistribute the load evenly. If the problem persists, professional diagnosis of the motor, drive belt, and control system may be necessary. Motor replacement or belt replacement may be required.`,
      
      'Not draining': `Your${brandInfo} washing machine${modelInfo} drainage problems are usually due to clogged pumps, blocked hoses, or pump motor failures. The drain system uses a pump to remove water from the machine during the drain and spin cycles. When the pump is clogged with debris, the drain hose is blocked, or the pump motor fails, water cannot be properly removed. The most effective solution is to first check the drain hose for kinks or blockages, then clean the pump filter if accessible. If drainage issues persist, professional cleaning of the drain system or pump replacement may be necessary.`,
      
      'Making loud noises': `Your${brandInfo} washing machine${modelInfo} loud noises often indicate bearing problems, motor issues, or loose components. The machine contains several mechanical components including the motor, transmission, and drum bearings that can develop issues over time. Grinding, squealing, or banging sounds typically indicate bearing wear, motor problems, or loose mounting hardware. The most effective solution is to first check for loose items in the drum and ensure the machine is level. If noises persist, professional inspection of the bearings, motor, and mechanical components may be necessary. Bearing replacement or motor repair may be required.`,
      
      'Not filling with water': `Your${brandInfo} washing machine${modelInfo} water supply issues are typically caused by valve problems, hose blockages, or control board malfunctions. The water inlet system includes water inlet valves, supply hoses, and control components that regulate water flow into the machine. When these components fail, the machine cannot fill with water for washing. The most effective solution is to first check the water supply valves and ensure the supply hoses are not kinked or blocked. If the machine still won't fill, professional diagnosis of the inlet valves and control system may be necessary. Valve replacement or control board repair may be required.`,
      
      'Door not locking': `Your${brandInfo} washing machine${modelInfo} door lock problems are usually due to mechanical failures, electrical issues, or safety switch malfunctions. The door lock mechanism prevents the machine from operating when the door is open and ensures safety during operation. When the lock mechanism fails, electrical connections are loose, or safety switches malfunction, the machine cannot start or may stop during operation. The most effective solution is to first check for obstructions around the door and ensure the door closes completely. If the lock still doesn't work, professional repair of the door lock mechanism or safety switch replacement may be necessary.`
    },
    'Microwave': {
      'Not heating': `Your${brandInfo} microwave${modelInfo} heating failure is typically caused by magnetron problems, high voltage issues, or control board malfunctions. The magnetron is the component that generates microwave energy to heat food, and it requires high voltage power from the transformer and capacitor system. When the magnetron fails, high voltage components malfunction, or the control board doesn't send proper signals, the microwave cannot heat food. The most effective solution is to first check if the microwave is receiving power and the door closes properly. If heating issues persist, professional diagnosis of the magnetron, high voltage system, and control board is necessary. Magnetron replacement or high voltage component repair may be required.`,
      
      'Not turning on': `Your${brandInfo} microwave${modelInfo} power issues are usually related to electrical problems, fuse failures, or control board issues. The electrical system includes fuses, switches, and control components that must all function properly for the microwave to start. Power surges, loose connections, or component failures can prevent the system from receiving or processing the start command. The most effective solution is to first check the power cord and outlet, then inspect the door switches for proper operation. If the microwave still won't start, professional diagnosis of the electrical system and control board may be necessary. Fuse replacement or control board repair may be required.`,
      
      'Making strange noises': `Your${brandInfo} microwave${modelInfo} unusual sounds often indicate motor problems, fan issues, or magnetron malfunctions. The microwave contains several mechanical components including the turntable motor, cooling fan, and magnetron that can develop issues over time. Grinding, buzzing, or arcing sounds typically indicate motor wear, fan problems, or magnetron issues. The most effective solution is to first check for loose items inside the microwave and ensure the turntable rotates freely. If noises persist, professional inspection of the motors, fan, and magnetron may be necessary. Motor replacement or magnetron repair may be required.`,
      
      'Turntable not spinning': `Your${brandInfo} microwave${modelInfo} turntable problems are typically caused by motor failures, gear issues, or mechanical obstructions. The turntable motor rotates the glass plate to ensure even heating of food. When the motor fails, the drive gears wear out, or objects obstruct the turntable, it cannot rotate properly. The most effective solution is to first check for obstructions around the turntable and ensure it's properly seated. If the turntable still doesn't spin, professional inspection of the turntable motor and drive system may be necessary. Motor replacement or gear repair may be required.`,
      
      'Door not closing properly': `Your${brandInfo} microwave${modelInfo} door issues are usually due to hinge problems, latch malfunctions, or safety switch failures. The door mechanism includes hinges, latches, and safety switches that ensure proper operation and safety. When these components wear out, become misaligned, or fail, the door may not close properly or the microwave may not start. The most effective solution is to first check for obstructions around the door and ensure the hinges are properly aligned. If door problems persist, professional repair of the door mechanism or safety switch replacement may be necessary.`
    }
  };

  // Get diagnosis for the specific category and issue
  const categoryDiagnoses = instantDiagnoses[category];
  if (categoryDiagnoses && categoryDiagnoses[issue]) {
    return categoryDiagnoses[issue];
  }

  // Generic fallback diagnosis
  return `Based on your ${category}${brandInfo}${modelInfo} with "${issue}", this appears to be a common issue that requires professional inspection. The symptoms suggest a technical problem that needs expert diagnosis and repair.`;
};


// Intelligent fallback diagnosis when AI services are unavailable
const generateIntelligentDiagnosis = (category: string, issue: string, brand?: string, model?: string): string => {
  const modelInfo = model ? ` (${model})` : '';
  const brandInfo = brand ? ` ${brand}` : '';
  
  // Common diagnosis patterns based on category and issue
  const diagnosisPatterns: { [key: string]: { [key: string]: string } } = {
    'Television': {
      'No display/black screen': `Your${brandInfo} TV${modelInfo} most likely has a backlight failure in the LED strip array. This is typically caused by aging LEDs, power supply issues, or inverter board problems, resulting in the black screen you're experiencing. The issue may also affect the power management system.`,
      'No sound': `Your${brandInfo} TV${modelInfo} appears to have an audio system failure. This could be caused by speaker damage, audio board issues, or software problems. The sound processing circuit may need repair or replacement.`,
      'Remote not working': `Your${brandInfo} TV${modelInfo} remote control issue is likely due to infrared sensor problems, remote battery issues, or signal interference. The TV's IR receiver may need cleaning or replacement.`,
      'Screen flickering': `Your${brandInfo} TV${modelInfo} is experiencing display flickering, which typically indicates power supply instability, backlight issues, or panel problems. The power management system may need attention.`,
      'Poor picture quality': `Your${brandInfo} TV${modelInfo} picture quality issues are often caused by panel degradation, signal processing problems, or cable connections. The display panel or video processing board may need repair.`
    },
    'Air Conditioner': {
      'Not cooling': `Your${brandInfo} air conditioner${modelInfo} cooling failure is typically caused by refrigerant leaks, compressor issues, or blocked filters. The cooling system may need professional inspection and repair.`,
      'Not turning on': `Your${brandInfo} air conditioner${modelInfo} power issues are usually related to electrical problems, thermostat malfunctions, or control board failures. The electrical system needs professional diagnosis.`,
      'Making strange noises': `Your${brandInfo} air conditioner${modelInfo} unusual sounds often indicate motor problems, fan issues, or loose components. The mechanical system may need maintenance or repair.`,
      'Water leaking': `Your${brandInfo} air conditioner${modelInfo} water leakage is typically caused by clogged drain lines, improper installation, or condensation issues. The drainage system needs attention.`,
      'Remote not working': `Your${brandInfo} air conditioner${modelInfo} remote control problems are usually due to signal issues, battery problems, or receiver malfunctions. The remote system may need repair.`
    },
    'Refrigerator': {
      'Not cooling': `Your${brandInfo} refrigerator${modelInfo} cooling failure is typically caused by compressor issues, refrigerant leaks, or thermostat problems. The cooling system needs professional inspection.`,
      'Making loud noises': `Your${brandInfo} refrigerator${modelInfo} loud noises often indicate motor problems, fan issues, or compressor malfunctions. The mechanical components may need repair.`,
      'Water leaking': `Your${brandInfo} refrigerator${modelInfo} water leakage is usually caused by blocked drain lines, door seal issues, or defrost system problems. The drainage and sealing systems need attention.`,
      'Ice maker not working': `Your${brandInfo} refrigerator${modelInfo} ice maker failure is typically due to water supply issues, mechanical problems, or electrical malfunctions. The ice making system needs repair.`,
      'Door not sealing': `Your${brandInfo} refrigerator${modelInfo} door seal problems are usually caused by worn gaskets, misalignment, or damage. The door sealing system needs replacement or adjustment.`
    },
    'Washing Machine': {
      'Not spinning': `Your${brandInfo} washing machine${modelInfo} spin cycle failure is typically caused by motor problems, belt issues, or control board malfunctions. The mechanical system needs professional repair.`,
      'Not draining': `Your${brandInfo} washing machine${modelInfo} drainage problems are usually due to clogged pumps, blocked hoses, or pump motor failures. The drainage system needs attention.`,
      'Making loud noises': `Your${brandInfo} washing machine${modelInfo} loud noises often indicate bearing problems, motor issues, or loose components. The mechanical system may need repair.`,
      'Not filling with water': `Your${brandInfo} washing machine${modelInfo} water supply issues are typically caused by valve problems, hose blockages, or control board malfunctions. The water system needs inspection.`,
      'Door not locking': `Your${brandInfo} washing machine${modelInfo} door lock problems are usually due to mechanical failures, electrical issues, or safety switch malfunctions. The locking mechanism needs repair.`
    },
    'Microwave': {
      'Not heating': `Your${brandInfo} microwave${modelInfo} heating failure is typically caused by magnetron problems, high voltage issues, or control board malfunctions. The heating system needs professional repair.`,
      'Not turning on': `Your${brandInfo} microwave${modelInfo} power issues are usually related to electrical problems, fuse failures, or control board issues. The electrical system needs diagnosis.`,
      'Making strange noises': `Your${brandInfo} microwave${modelInfo} unusual sounds often indicate motor problems, fan issues, or magnetron malfunctions. The mechanical system may need repair.`,
      'Turntable not spinning': `Your${brandInfo} microwave${modelInfo} turntable problems are typically caused by motor failures, gear issues, or mechanical obstructions. The turntable system needs repair.`,
      'Door not closing properly': `Your${brandInfo} microwave${modelInfo} door issues are usually due to hinge problems, latch malfunctions, or safety switch failures. The door mechanism needs attention.`
    }
  };

  // Get diagnosis for the specific category and issue
  const categoryDiagnoses = diagnosisPatterns[category];
  if (categoryDiagnoses && categoryDiagnoses[issue]) {
    return categoryDiagnoses[issue];
  }

  // Generic fallback diagnosis
  return `Based on your ${category}${brandInfo}${modelInfo} with "${issue}", this appears to be a common issue that requires professional inspection. The symptoms suggest a technical problem that needs expert diagnosis and repair.`;
};

// Intelligent fallback pricing when AI services are unavailable
const generateIntelligentPricing = (category: string, issue: string, brand?: string, model?: string): number => {
  // Base pricing by category
  const basePrices: { [key: string]: number } = {
    'Television': 120,
    'Air Conditioner': 180,
    'Refrigerator': 150,
    'Washing Machine': 140,
    'Microwave': 80
  };

  // Brand multipliers (premium brands cost more)
  const brandMultipliers: { [key: string]: number } = {
    'Samsung': 1.3,
    'LG': 1.3,
    'Sony': 1.4,
    'Panasonic': 1.2,
    'Daikin': 1.3,
    'Mitsubishi': 1.3,
    'Whirlpool': 1.1,
    'Electrolux': 1.1,
    'Sharp': 1.1,
    'Toshiba': 1.1,
    'Hitachi': 1.1
  };

  // Issue complexity multipliers
  const issueMultipliers: { [key: string]: number } = {
    'No display/black screen': 1.2,
    'Not cooling': 1.3,
    'Not spinning': 1.2,
    'Not heating': 1.1,
    'Making loud noises': 1.0,
    'Water leaking': 0.9,
    'Remote not working': 0.7,
    'Door not sealing': 0.8,
    'Screen flickering': 1.1,
    'Poor picture quality': 1.0
  };

  let price = basePrices[category] || 120;
  
  // Apply brand multiplier
  if (brand && brandMultipliers[brand]) {
    price *= brandMultipliers[brand];
  }
  
  // Apply issue complexity multiplier
  if (issueMultipliers[issue]) {
    price *= issueMultipliers[issue];
  }
  
  // Round to nearest 10
  return Math.round(price / 10) * 10;
};

// AI-powered diagnosis using OpenAI
const diagnoseWithGroq = async (category: string, issue: string, brand?: string, model?: string): Promise<{ diagnosis: string; error?: string }> => {
  try {
    // Check if API key is properly configured
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error('Groq API key not configured');
    }

    const prompt = `As an expert electronics repair technician, provide a detailed diagnosis for:

APPLIANCE: ${category}
ISSUE DESCRIPTION: ${issue}
BRAND: ${brand || 'Not specified'}
MODEL: ${model || 'Not specified'}

INSTRUCTIONS:
1. If MODEL is provided, use it to give SPECIFIC technical details about that exact model
2. Analyze the symptoms and provide a detailed technical diagnosis
3. Explain the most likely cause(s) of the problem with model-specific components
4. Include technical details about what's happening in the specific model
5. Mention any secondary issues that might be present in this model
6. Be specific about the component or system affected (use model knowledge)
7. If no model provided, give general but detailed diagnosis
8. Keep the response informative but accessible to users

RESPOND WITH A DETAILED DIAGNOSIS (2-3 sentences, technical but clear):
Example with model: "Your Samsung QN65Q80TAFXZA most likely has a backlight failure in the LED strip array. This specific model uses edge-lit LED technology that commonly fails due to aging LEDs or power supply issues in the Q80T series, resulting in the black screen you're experiencing. The issue may also affect the power management system specific to this model."
Example without model: "Your Samsung TV most likely has a backlight failure in the LED strip array. This is typically caused by aging LEDs or power supply issues, resulting in the black screen you're experiencing. The issue may also affect the power management system."`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expert electronics repair technician with deep knowledge of various appliance brands and models.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from Groq');
    }

    return { diagnosis: aiResponse };
  } catch (error) {
    console.log('Groq diagnosis failed:', error);
    throw error;
  }
};

// AI-powered diagnosis using Gemini (Google)
const diagnoseWithGemini = async (category: string, issue: string, brand?: string, model?: string): Promise<{ diagnosis: string; error?: string }> => {
  try {
    // Check if API key is properly configured
    if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
      throw new Error('Gemini API key not configured');
    }
    
    console.log('Using Gemini API key:', GEMINI_API_KEY.substring(0, 10) + '...');
    console.log('Gemini API URL:', GEMINI_API_URL);

    const prompt = `As an expert electronics repair technician, provide a detailed diagnosis for:

APPLIANCE: ${category}
ISSUE DESCRIPTION: ${issue}
BRAND: ${brand || 'Not specified'}
MODEL: ${model || 'Not specified'}

INSTRUCTIONS:
1. If MODEL is provided, use it to give SPECIFIC technical details about that exact model
2. Analyze the symptoms and provide a detailed technical diagnosis
3. Explain the most likely cause(s) of the problem with model-specific components
4. Include technical details about what's happening in the specific model
5. Mention any secondary issues that might be present in this model
6. Be specific about the component or system affected (use model knowledge)
7. If no model provided, give general but detailed diagnosis
8. Keep the response informative but accessible to users

RESPOND WITH A DETAILED DIAGNOSIS (2-3 sentences, technical but clear):
Example with model: "Your Samsung QN65Q80TAFXZA most likely has a backlight failure in the LED strip array. This specific model uses edge-lit LED technology that commonly fails due to aging LEDs or power supply issues in the Q80T series, resulting in the black screen you're experiencing. The issue may also affect the power management system specific to this model."
Example without model: "Your Samsung TV most likely has a backlight failure in the LED strip array. This is typically caused by aging LEDs or power supply issues, resulting in the black screen you're experiencing. The issue may also affect the power management system."`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from Gemini');
    }

    return { diagnosis: aiResponse };
  } catch (error) {
    console.log('Gemini diagnosis failed:', error);
    throw error;
  }
};

// AI-powered price estimation using Gemini (Google)
const estimatePriceWithGemini = async (category: string, issue: string, brand?: string, model?: string): Promise<{ price: number; error?: string }> => {
  try {
    // Check if API key is properly configured
    if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
      throw new Error('Gemini API key not configured');
    }
    
    console.log('Using Gemini API key for pricing:', GEMINI_API_KEY.substring(0, 10) + '...');

    const prompt = `As an expert electronics repair technician, analyze and estimate the repair cost in USD for:

APPLIANCE: ${category}
ISSUE DESCRIPTION: ${issue}
BRAND: ${brand || 'Not specified'}
MODEL: ${model || 'Not specified'}

INSTRUCTIONS:
1. If MODEL is provided, use it to give SPECIFIC pricing for that exact model's parts and repair complexity
2. Estimate repair cost in USD based on US market pricing for parts and labor
3. Factor in brand reputation and part availability (premium brands = higher costs)
4. Consider complexity and typical repair scenarios for this specific model
5. Account for 2-4 hours typical labor time at $50-80/hour
6. Include reasonable profit margin for technician
7. If no model provided, use general category pricing

PRICING CONSIDERATIONS:
- Premium brands (Samsung, LG, Sony) = higher part costs
- Specific models may have unique components or repair procedures
- Older models may have discontinued parts (higher cost)
- Newer models may have more complex repairs

RESPOND WITH ONLY A NUMBER IN USD (no currency symbol, no explanation, no text):
Example: 150`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from Gemini');
    }

    // Extract number from response
    const priceMatch = aiResponse.match(/\d+/);
    if (!priceMatch) {
      throw new Error('Invalid Gemini response format');
    }

    const estimatedPriceUSD = parseInt(priceMatch[0]);
    
    // Validate price range (reasonable for USD)
    if (estimatedPriceUSD < 5 || estimatedPriceUSD > 500) {
      throw new Error('Price out of reasonable range');
    }

    // Convert USD to PHP using current exchange rate
    const exchangeRate = await getCurrentExchangeRate();
    const estimatedPricePHP = Math.round(estimatedPriceUSD * exchangeRate);

    return { price: estimatedPricePHP };
  } catch (error) {
    console.log('Gemini estimation failed:', error);
    throw error;
  }
};

// AI-powered price estimation using OpenAI
const estimatePriceWithGroq = async (category: string, issue: string, brand?: string, model?: string): Promise<{ price: number; error?: string }> => {
  try {
    // Check if API key is properly configured
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error('Groq API key not configured. Please set EXPO_PUBLIC_GROQ_API_KEY environment variable.');
    }

    // Skip AI if too many rate limits hit recently
    if (rateLimitCount >= MAX_RATE_LIMIT_ATTEMPTS) {
      console.log('Rate limit exceeded. This is common with free tier API keys. Using fallback pricing.');
      throw new Error('Rate limit exceeded. Using fallback pricing.');
    }

    // Rate limiting - wait if called too recently
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < API_CALL_DELAY) {
      const waitTime = API_CALL_DELAY - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastApiCall = Date.now();
    const prompt = `As an expert electronics repair technician, analyze and estimate the repair cost in USD for:

APPLIANCE: ${category}
ISSUE DESCRIPTION: ${issue}
BRAND: ${brand || 'Not specified'}
MODEL: ${model || 'Not specified'}

INSTRUCTIONS:
1. If MODEL is provided, use it to give SPECIFIC pricing for that exact model's parts and repair complexity
2. Extract brand and model information from the issue description if not provided
3. Estimate repair cost in USD based on US market pricing for parts and labor
4. Factor in brand reputation and part availability:
   - Premium brands (Samsung, LG, Sony, Panasonic, Daikin, Mitsubishi): +40% premium
   - Mid-range brands (Whirlpool, Electrolux, Sharp, Toshiba, Hitachi): +20% premium  
   - Budget/Generic brands: Standard pricing
5. Consider complexity and typical repair scenarios for this specific model
6. Account for 2-4 hours typical labor time at $50-80/hour
7. Include reasonable profit margin for technician
8. Consider part costs, diagnostic time, and repair complexity

MODEL-SPECIFIC CONSIDERATIONS:
- Specific models may have unique components or repair procedures
- Older models may have discontinued parts (higher cost)
- Newer models may have more complex repairs
- Premium model series (like Samsung Q80T, LG C1, etc.) = higher costs

RESPOND WITH ONLY A NUMBER IN USD (no currency symbol, no explanation, no text):
Example: 150`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        rateLimitCount++;
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Groq API key.');
      } else {
        throw new Error(`Groq API error: ${response.status}`);
      }
    }

    // Reset rate limit counter on successful call
    rateLimitCount = 0;

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Extract number from response
    const priceMatch = aiResponse.match(/\d+/);
    if (!priceMatch) {
      throw new Error('Invalid AI response format');
    }

    const estimatedPriceUSD = parseInt(priceMatch[0]);
    
    // Validate price range (reasonable for USD)
    if (estimatedPriceUSD < 5 || estimatedPriceUSD > 500) {
      throw new Error('Price out of reasonable range');
    }

    // Convert USD to PHP using current exchange rate
    const exchangeRate = await getCurrentExchangeRate();
    const estimatedPricePHP = Math.round(estimatedPriceUSD * exchangeRate);

    return { price: estimatedPricePHP };
  } catch (error) {
    console.log('AI estimation failed, falling back to keyword system:', error);
    // Fallback to keyword-based estimation
    return estimateCustomIssuePrice(category, issue, brand);
  }
};

// Smart custom issue price estimation
const estimateCustomIssuePrice = (category: string, customIssue: string, brand?: string) => {
  // First validate the input
  const validation = validateCustomIssue(customIssue);
  if (!validation.isValid) {
    return { price: 0, error: validation.reason };
  }
  
  const issue = customIssue.toLowerCase();
  
  // Keyword-based severity detection
  const severityKeywords = {
    critical: ['broken', 'cracked', 'shattered', 'exploded', 'burned', 'melted', 'dead', 'completely'],
    major: ['not working', 'stopped', 'failed', 'damaged', 'leaking', 'overheating', 'smoking'],
    moderate: ['slow', 'weak', 'intermittent', 'sometimes', 'occasionally', 'flickering', 'noisy'],
    minor: ['slightly', 'little', 'small', 'minor', 'barely', 'almost']
  };

  // Component-based pricing
  const componentKeywords = {
    screen: ['screen', 'display', 'monitor', 'lcd', 'led', 'picture', 'image'],
    power: ['power', 'electric', 'battery', 'charging', 'plug', 'cord', 'cable'],
    mechanical: ['motor', 'fan', 'spinning', 'rotating', 'moving', 'mechanical'],
    electronic: ['circuit', 'board', 'chip', 'sensor', 'control', 'remote'],
    cooling: ['cooling', 'heating', 'temperature', 'thermal', 'refrigerant'],
    water: ['water', 'leak', 'drain', 'pump', 'valve', 'hose']
  };

  // Brand multipliers
  const brandMultipliers = {
    premium: ['samsung', 'lg', 'sony', 'panasonic', 'daikin', 'mitsubishi'],
    midrange: ['whirlpool', 'electrolux', 'sharp', 'toshiba', 'hitachi'],
    budget: ['generic', 'unknown', 'local', 'cheap']
  };

  // Detect severity
  let severity = 'moderate'; // default
  for (const [level, keywords] of Object.entries(severityKeywords)) {
    if (keywords.some(keyword => issue.includes(keyword))) {
      severity = level;
      break;
    }
  }

  // Detect components
  const detectedComponents = [];
  for (const [component, keywords] of Object.entries(componentKeywords)) {
    if (keywords.some(keyword => issue.includes(keyword))) {
      detectedComponents.push(component);
    }
  }

  // Get brand multiplier
  let brandMultiplier = 1.0;
  if (brand) {
    const brandLower = brand.toLowerCase();
    if (brandMultipliers.premium.some(b => brandLower.includes(b))) {
      brandMultiplier = 1.3;
    } else if (brandMultipliers.midrange.some(b => brandLower.includes(b))) {
      brandMultiplier = 1.1;
    } else if (brandMultipliers.budget.some(b => brandLower.includes(b))) {
      brandMultiplier = 0.8;
    }
  }

  // Base prices by category and severity
  const basePriceMatrix = {
    'Television': { critical: 3000, major: 2000, moderate: 1500, minor: 1000 },
    'Electric Fan': { critical: 1200, major: 800, moderate: 600, minor: 400 },
    'Air Conditioner': { critical: 4000, major: 2500, moderate: 1800, minor: 1200 },
    'Refrigerator': { critical: 5000, major: 3000, moderate: 2000, minor: 1500 },
    'Washing Machine': { critical: 3500, major: 2200, moderate: 1500, minor: 1000 }
  };

  // Component complexity multipliers
  const componentMultipliers = {
    screen: 1.5,
    power: 1.2,
    mechanical: 1.3,
    electronic: 1.4,
    cooling: 1.6,
    water: 1.1
  };

  // Calculate base price
  let basePrice = (basePriceMatrix as any)[category]?.[severity] || 1500;

  // Apply component multipliers
  let componentMultiplier = 1.0;
  if (detectedComponents.length > 0) {
    componentMultiplier = Math.max(...detectedComponents.map(comp => (componentMultipliers as any)[comp] || 1.0));
  }

  // Calculate final price
  const finalPrice = Math.round(basePrice * componentMultiplier * brandMultiplier);

  // Add some randomness to make it feel more realistic (±10%)
  const variation = finalPrice * 0.1;
  const randomVariation = (Math.random() - 0.5) * 2 * variation;
  
  const finalEstimatedPrice = Math.max(500, Math.round(finalPrice + randomVariation)); // Minimum 500 pesos
  return { price: finalEstimatedPrice, error: '' };
};

export default function Diagnose() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [otherIssue, setOtherIssue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isUsingAI, setIsUsingAI] = useState(false);
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [showModelHelp, setShowModelHelp] = useState(false);
  const [showPriceButton, setShowPriceButton] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Brand options for each category (Philippines market - comprehensive list)
  const brandOptions = {
    'Television': [
      'Avision', 'Astron', 'Devant', 'Haier', 'Hisense', 'Konka', 'KTC', 'LG', 
      'Panasonic', 'Philips', 'Prestiz', 'Ross', 'Samsung', 'Sanus', 'Sharp', 
      'Skyworth', 'Sony', 'TCL', 'Toshiba', 'Xiaomi', 'Xtreme', 'Xenon'
    ],
    'Air Conditioner': [
      'American Home', 'Astron', 'Carrier', 'Condura', 'Daikin', 'Everest', 'Fabriano', 
      'Fujidenzo', 'Gree', 'Haier', 'Hisense', 'Koppel', 'Kolin', 'LG', 'Midea', 
      'Mitsubishi Electric', 'Panasonic', 'Samsung', 'TCL', 'Toshiba', 'Whirlpool'
    ],
    'Refrigerator': [
      'American Home', 'Astron', 'Beko', 'Condura', 'Devant', 'Elba', 'Everest', 'Ezy', 
      'Fujidenzo', 'Haier', 'Hisense', 'Hitachi', 'LG', 'Midea', 'Panasonic', 
      'Philips', 'Samsung', 'Sharp', 'TCL', 'Tekno', 'Toshiba', 'Whirlpool', 'Xtreme'
    ],
    'Washing Machine': [
      'American Home', 'Asahi', 'Astron', 'Beko', 'Condura', 'Dowell', 'Everest', 'Fabriano', 
      'Fujidenzo', 'Haier', 'Hisense', 'LG', 'Midea', 'Panasonic', 'Samsung', 
      'Sharp', 'Standard', 'TCL', 'Toshiba', 'Whirlpool'
    ],
    'Microwave': [
      'Samsung', 'LG', 'Panasonic', 'Sharp', 'Toshiba', 'Haier', 'Midea', 
      'Whirlpool', 'GE', 'Electrolux', 'Asahi', 'TCL', 'Hisense', 'Condura', 'Kolin'
    ],
    'Electric Fan': [
      'Anker', 'Asahi', 'Asahi Appliances', 'Astron', 'AOC', 'Black & Decker', 'Camel', 
      'Dowell', 'Everlast', 'Hanabishi', 'Imarflex', 'KDK', 'Midea', 'Panasonic', 
      'Sharp', 'Standard', 'Toshiba', 'Xtreme', 'American Home', 'Fujidenzo', 'Kolin'
    ]
  };

  // Instant pricing for predefined issues (AI-quality pricing)
  const generateInstantPricing = (category: string, issue: string, brand?: string, model?: string): number => {
    // Brand multipliers (premium brands cost more to repair) - Philippines market
    const brandMultipliers: { [key: string]: number } = {
      // Premium brands (1.2x - 1.4x)
      'Samsung': 1.3,
      'LG': 1.2,
      'Sony': 1.4,
      'Panasonic': 1.1,
      'Sharp': 1.0,
      'Toshiba': 0.9,
      'Daikin': 1.3,
      'Carrier': 1.2,
      'Mitsubishi Electric': 1.4,
      'Whirlpool': 1.0,
      'Electrolux': 1.1,
      'GE': 1.0,
      'Hitachi': 1.1,
      'Philips': 1.0,
      'Xiaomi': 1.1,
      
      // Popular Philippine brands (0.9x - 1.0x)
      'Condura': 1.0,
      'Kolin': 0.9,
      'Asahi': 0.8,
      'Asahi Appliances': 0.8,
      'Hanabishi': 0.7,
      'Imarflex': 0.7,
      'American Home': 0.8,
      'Fujidenzo': 0.8,
      'Everest': 0.8,
      'Devant': 0.9,
      'Beko': 0.9,
      'KDK': 0.9,
      'Astron': 0.8,
      'Standard': 0.7,
      
      // Budget brands (0.7x - 0.8x)
      'TCL': 0.9,
      'Hisense': 0.8,
      'Haier': 0.8,
      'Midea': 0.8,
      'Gree': 0.8,
      'Skyworth': 0.8,
      'Konka': 0.7,
      'AOC': 0.7,
      'KTC': 0.7,
      'Ross': 0.7,
      'Prestiz': 0.7,
      'Sanus': 0.7,
      'Xenon': 0.7,
      'Xtreme': 0.7,
      'Avision': 0.7,
      'Elba': 0.7,
      'Ezy': 0.7,
      'Tekno': 0.7,
      'Dowell': 0.7,
      'Fabriano': 0.7,
      'Koppel': 0.7,
      'Camel': 0.7,
      'Everlast': 0.7,
      'Black & Decker': 0.8,
      'Anker': 0.8
    };

    // Base pricing for each category and issue (in PHP)
    const basePricing: { [key: string]: { [key: string]: number } } = {
      'Television': {
        'No display/black screen': 3200, // Backlight/LED strip replacement
        'No sound': 2200, // Audio board/speaker repair
        'Remote not working': 600, // IR sensor/remote replacement
        'Screen flickering': 2800, // Power supply/backlight driver
        'Poor picture quality': 2500 // Panel calibration/processing board
      },
      'Electric Fan': {
        'Not spinning': 800, // Motor/bearing issues
        'Making noise': 500, // Bearing/motor problems
        'Speed control not working': 400, // Speed control switch/capacitor
        'Oscillation not working': 300, // Oscillation mechanism
        'Power issues': 350 // Power cord/switch problems
      },
      'Air Conditioner': {
        'Not cooling': 3800, // Refrigerant leak/compressor issues
        'Not turning on': 2200, // Electrical/control board problems
        'Making strange noises': 2800, // Motor/bearing replacement
        'Water leaking': 1800, // Drain line/condensation issues
        'Remote not working': 800 // Remote/IR receiver problems
      },
      'Refrigerator': {
        'Not cooling': 4200, // Compressor/refrigerant system
        'Making loud noises': 3200, // Compressor/motor issues
        'Water leaking': 2200, // Drain line/defrost system
        'Ice maker not working': 1800, // Water line/ice maker mechanism
        'Door not sealing': 1200 // Gasket replacement/adjustment
      },
      'Washing Machine': {
        'Not spinning': 3800, // Motor/transmission problems
        'Not draining': 2800, // Pump/drain system issues
        'Making loud noises': 3200, // Bearing/motor problems
        'Not filling with water': 2200, // Water inlet valve issues
        'Door not locking': 1800 // Door lock mechanism repair
      },
      'Microwave': {
        'Not heating': 2800, // Magnetron/high voltage issues
        'Not turning on': 1800, // Control board/power issues
        'Making strange noises': 2200, // Motor/magnetron problems
        'Turntable not spinning': 1200, // Turntable motor repair
        'Door not closing properly': 1000 // Door mechanism adjustment
      }
    };

    // Get base price for the specific category and issue
    const categoryPricing = basePricing[category];
    if (!categoryPricing || !categoryPricing[issue]) {
      return 2500; // Generic fallback
    }

    let basePrice = categoryPricing[issue];

    // Apply brand multiplier if brand is specified
    if (brand) {
      const brandKey = brand.toLowerCase();
      const multiplier = brandMultipliers[brandKey] || 1.0;
      basePrice = Math.round(basePrice * multiplier);
    }

    // Add complexity factor based on model (premium models cost more)
    if (model) {
      const modelLower = model.toLowerCase();
      
      // Premium display technologies (higher multiplier)
      if (modelLower.includes('oled') || modelLower.includes('qled') || modelLower.includes('8k') || 
          modelLower.includes('neo qled') || modelLower.includes('micro led') || modelLower.includes('mini led')) {
        basePrice = Math.round(basePrice * 1.3); // Premium display technology
      }
      // High-end features
      else if (modelLower.includes('4k') || modelLower.includes('hdr') || modelLower.includes('dolby vision') ||
               modelLower.includes('quantum') || modelLower.includes('crystal')) {
        basePrice = Math.round(basePrice * 1.2); // High-end features
      }
      // Smart features
      else if (modelLower.includes('smart') || modelLower.includes('android') || modelLower.includes('webos') ||
               modelLower.includes('tizen') || modelLower.includes('roku')) {
        basePrice = Math.round(basePrice * 1.1); // Smart features
      }
      
      // Size-based pricing for TVs (larger = more expensive to repair)
      if (category === 'Television') {
        const sizeMatch = model.match(/(\d+)[\s"]*(inch|in|"|cm)/i);
        if (sizeMatch) {
          const size = parseInt(sizeMatch[1]);
          if (size >= 75) {
            basePrice = Math.round(basePrice * 1.25); // 75"+ TVs
          } else if (size >= 65) {
            basePrice = Math.round(basePrice * 1.15); // 65-74" TVs
          } else if (size >= 55) {
            basePrice = Math.round(basePrice * 1.05); // 55-64" TVs
          }
        }
      }
    }

    // Add some realistic variation (±5%)
    const variation = basePrice * 0.05;
    const randomVariation = (Math.random() - 0.5) * 2 * variation;
    const priceWithVariation = basePrice + randomVariation;

    // Round to nearest 5 or 0 for professional pricing
    const roundedPrice = Math.round(priceWithVariation / 5) * 5;

    // Ensure minimum price and ends in 0 or 5
    return Math.max(500, roundedPrice);
  };
  
  // Animation effect
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showDisclaimer ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showDisclaimer]);

  // Validate API keys on component mount (only for debugging)
  useEffect(() => {
    validateApiKeys();
    // Note: API testing removed - only needed for custom issues
  }, []);

  // Reset form when reset parameter is passed
  useEffect(() => {
    console.log('Diagnose.tsx - params.reset:', params.reset);
    if (params.reset === 'true') {
      console.log('Resetting diagnose.tsx form...');
      resetForm();
    }
  }, [params.reset]);

  // Reset form when screen comes into focus with reset parameter
  useFocusEffect(
    React.useCallback(() => {
      console.log('Diagnose.tsx - Screen focused, params.reset:', params.reset);
      if (params.reset === 'true') {
        console.log('Resetting diagnose.tsx form on focus...');
        resetForm();
      }
    }, [params.reset])
  );

  // Function to reset all form state
  const resetForm = () => {
    setSelectedCategory('');
    setSelectedIssue('');
    setBrand('');
    setModel('');
    setOtherIssue('');
    setEstimatedCost(0);
    setDiagnosisResult('');
    setValidationError('');
    setSubmitting(false);
    setDiagnosing(false);
    setPricing(false);
    setLoadingStep(0);
    setShowLoadingScreen(false);
    setShowDisclaimer(true);
    setIsUsingAI(false);
    setApiStatus('Checking...');
    setShowModelHelp(false);
    // Reset expanded sections
    setExpandedSections({
      category: false,
      details: false,
      issue: false,
      result: false,
      price: false,
    });
  };

  // Validation for custom issues only (no real-time pricing)
  useEffect(() => {
    if (selectedIssue === 'Others (please specify)' && otherIssue.trim()) {
      const validation = validateCustomIssue(otherIssue);
      if (!validation.isValid) {
        setValidationError(validation.reason);
      } else {
        setValidationError('');
      }
    } else {
      setValidationError('');
    }
  }, [otherIssue, selectedIssue]);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    category: false,
    details: false,
    issue: false,
    result: false,
    price: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Clear all inputs function
  const clearAllInputs = () => {
    setSelectedCategory('');
    setSelectedIssue('');
    setBrand('');
    setModel('');
    setOtherIssue('');
    setEstimatedCost(0);
    setDiagnosisResult('');
    setValidationError('');
    setExpandedSections({
      category: false,
      details: false,
      issue: false,
      result: false
    });
  };

  const getSectionButtonStyle = (section: string) => {
    return [
      diagnoseStyles.sectionButton,
      expandedSections[section] && diagnoseStyles.sectionButtonExpanded
    ];
  };

  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      // If same category is clicked, deselect it
      setSelectedCategory('');
      setSelectedIssue('');
      setBrand('');
      setModel('');
      setOtherIssue('');
      setEstimatedCost(0);
      setDiagnosisResult('');
      setShowPriceButton(false);
      setExpandedSections(prev => ({ 
        ...prev, 
        category: false,
        details: false
      }));
    } else {
      // Select new category
      setSelectedCategory(category);
      setSelectedIssue('');
      setBrand('');
      setModel('');
      setOtherIssue('');
      setEstimatedCost(0);
      setDiagnosisResult('');
      setShowPriceButton(false);
      setExpandedSections(prev => ({ 
        ...prev, 
        category: false, // Auto-collapse after selection
        details: true // Auto-expand next section (Device Details)
      }));
    }
  };

  const handleIssueSelect = (issue: any) => {
    if (selectedIssue === issue.name) {
      // If same issue is clicked, deselect it
      setSelectedIssue('');
      setEstimatedCost(0);
      setDiagnosisResult('');
      setShowPriceButton(false);
      setExpandedSections(prev => ({ 
        ...prev, 
        issue: false,
        result: false
      }));
    } else {
      // Select new issue
      setSelectedIssue(issue.name);
      setEstimatedCost(0);
      setDiagnosisResult('');
      setShowPriceButton(false);
      setExpandedSections(prev => ({ 
        ...prev, 
        issue: issue.name === 'Others (please specify)' ? true : false, // Keep expanded for "Others" option
        result: false // Keep result collapsed until diagnosis is done
      }));
    }
  };

  const handleBrandSelect = (selectedBrand: string) => {
    setBrand(selectedBrand);
    setEstimatedCost(0);
    setDiagnosisResult('');
    setShowPriceButton(false);
  };

  const handleModelChange = (text: string) => {
    setModel(text);
    setEstimatedCost(0);
    setDiagnosisResult('');
    setShowPriceButton(false);
  };

  // Check for existing appointments
  const checkExistingAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      
      if (!querySnapshot.empty) {
        const appointments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        // Check if there are any unrated completed repairs first
        const hasUnratedCompleted = appointments.some(appointment => {
          const status = appointment.status?.global || appointment.status;
          return status === 'Completed' && !appointment.status?.rated;
        });
        
        if (hasUnratedCompleted) {
          Alert.alert(
            'Complete Your Feedback',
            'Please complete your service feedback for the previous repair before booking a new one. Your feedback helps us maintain quality service.',
            [{ text: 'OK' }]
          );
          return true; // Return true to prevent booking
        }
        
        // Check if ANY appointment exists with active status (not just latest)
        const activeAppointment = appointments.find(appointment => {
          const status = appointment.status?.global || appointment.status;
          return status && !['Completed', 'Cancelled'].includes(status);
        });
        
        if (activeAppointment) {
          const currentStatus = activeAppointment.status?.global || activeAppointment.status;
          let alertTitle = 'Appointment Already Exists';
          let alertMessage = 'You already have an active appointment. Please wait for it to be completed before booking a new one.';
          
          // Customize message based on status
          if (currentStatus === 'Repairing') {
            alertTitle = 'Repair Ongoing';
            alertMessage = 'Your appliance is currently being repaired. Please wait for the repair to be completed before booking a new one.';
          } else if (currentStatus === 'Testing') {
            alertTitle = 'Testing Ongoing';
            alertMessage = 'Your appliance is currently being tested. Please wait for the testing to be completed before booking a new one.';
          } else if (currentStatus === 'Accepted') {
            alertTitle = 'Appointment Accepted';
            alertMessage = 'Your appointment has been accepted and is waiting to start. Please wait for it to be completed before booking a new one.';
          }
          
          Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking existing appointment:', error);
      return false;
    }
  };

  // Handle diagnosis
  const handleDiagnosis = async () => {
    if (!selectedCategory || !selectedIssue || !brand) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (selectedIssue === 'Others (please specify)' && !otherIssue.trim()) {
      Alert.alert('Error', 'Please specify the issue');
      return;
    }

    if (validationError) {
      Alert.alert('Invalid Input', validationError);
      return;
    }

    // Check if it's a predefined issue or custom issue
    if (selectedIssue !== 'Others (please specify)') {
      // Instant diagnosis for predefined issues
      const instantDiagnosis = generateInstantDiagnosis(selectedCategory, selectedIssue, brand, model);
      setDiagnosisResult(instantDiagnosis);
      
      // Auto-expand result section
      setExpandedSections(prev => ({ 
        ...prev, 
        result: true
      }));

      // Send diagnosis completion notification
      if (auth.currentUser) {
        await NotificationService.sendDiagnosisCompleteNotification(
          auth.currentUser.uid,
          selectedCategory,
          0 // Estimated cost will be set when user estimates price
        );
      }
    } else {
      // AI diagnosis for custom issues
      try {
        // Test API keys before starting AI diagnosis
        testGroqApiKey(setApiStatus);
        testGeminiApiKey(setApiStatus);
        
        setDiagnosing(true);
        setShowLoadingScreen(true);
        setLoadingStep(1);

        const issueDescription = otherIssue;
        
        let diagnosisResult;
        try {
          // Try Gemini first (better free tier limits)
          diagnosisResult = await diagnoseWithGemini(selectedCategory, issueDescription, brand, model);
          console.log('Using Gemini AI for diagnosis');
        } catch (geminiError) {
          console.log('Gemini failed, trying Groq:', geminiError);
          try {
          // Fallback to Groq
          diagnosisResult = await diagnoseWithGroq(selectedCategory, issueDescription, brand, model);
          console.log('Using Groq for diagnosis');
          } catch (groqError) {
            console.log('Both AI services failed, using intelligent fallback:', groqError);
            // Intelligent fallback diagnosis based on common issues
            const fallbackDiagnosis = generateIntelligentDiagnosis(selectedCategory, issueDescription, brand, model);
            console.log('Generated intelligent diagnosis:', fallbackDiagnosis);
            diagnosisResult = {
              diagnosis: fallbackDiagnosis
            };
          }
        }
        
        setDiagnosisResult(diagnosisResult.diagnosis);
        setShowLoadingScreen(false);
        setDiagnosing(false);
        
        // Auto-expand result section
        setExpandedSections(prev => ({ 
          ...prev, 
          result: true
        }));

        // Send diagnosis completion notification
        if (auth.currentUser) {
          await NotificationService.sendDiagnosisCompleteNotification(
            auth.currentUser.uid,
            selectedCategory,
            0 // Estimated cost will be set when user estimates price
          );
        }
        
      } catch (error) {
        console.error('Error during diagnosis:', error);
        setShowLoadingScreen(false);
        setDiagnosing(false);
        Alert.alert('Error', 'Failed to complete diagnosis');
      }
    }
  };

  // Handle price estimation
  const handlePriceEstimation = async () => {
    if (!diagnosisResult) {
      Alert.alert('Error', 'Please complete diagnosis first');
      return;
    }

    // Check if it's a predefined issue or custom issue
    if (selectedIssue !== 'Others (please specify)') {
      // Instant pricing for predefined issues
      const instantPrice = generateInstantPricing(selectedCategory, selectedIssue, brand, model);
      setEstimatedCost(instantPrice);
      setShowPriceButton(true);
      
      // Save to database
      const user = auth.currentUser;
      if (user) {
        const diagnosisData = {
          userId: user.uid,
          category: selectedCategory,
          brand: brand,
          model: model,
          issueDescription: selectedIssue,
          diagnosis: diagnosisResult,
          estimatedCost: instantPrice,
          createdAt: new Date(),
          status: 'completed'
        };

        await addDoc(collection(db, 'diagnoses'), diagnosisData);
      }
      
        Alert.alert(
          'Price Estimation Complete',
          `Estimated cost: ₱${instantPrice.toLocaleString()}\n\nWould you like to proceed with finding a technician?`,
          [
            { text: 'Maybe Later', onPress: () => {} },
            { 
              text: 'Find Technician', 
              onPress: async () => {
                const hasExistingAppointment = await checkExistingAppointment();
                
                if (hasExistingAppointment) {
                  return; // checkExistingAppointment already shows the appropriate alert
                }
                
                const diagnosisData = {
                  category: selectedCategory,
                  brand: brand,
                  model: model,
                  issue: selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue,
                  diagnosis: diagnosisResult,
                  estimatedCost: instantPrice.toString(),
                  isCustomIssue: (selectedIssue === 'Others (please specify)').toString(),
                };
                
                router.push({
                  pathname: '/bookings',
                  params: diagnosisData
                });
              }
            }
          ]
        );
    } else {
      // AI pricing for custom issues
      try {
        // Test API keys before starting AI pricing
        testGroqApiKey(setApiStatus);
        testGeminiApiKey(setApiStatus);
        
        setPricing(true);
        setShowLoadingScreen(true);
        setLoadingStep(2);

        const issueDescription = otherIssue;
        
        let aiResult;
        try {
          // Try Gemini first (better free tier limits)
          aiResult = await estimatePriceWithGemini(selectedCategory, issueDescription, brand, model);
          console.log('Using Gemini AI for pricing');
        } catch (geminiError) {
          console.log('Gemini failed, trying Groq:', geminiError);
          try {
            // Fallback to Groq
            aiResult = await estimatePriceWithGroq(selectedCategory, issueDescription, brand, model);
            console.log('Using Groq for pricing');
        } catch (groqError) {
          console.log('Both AI services failed, using intelligent pricing:', groqError);
            // Intelligent fallback pricing
            const fallbackPrice = generateIntelligentPricing(selectedCategory, issueDescription, brand, model);
            console.log('Generated intelligent pricing:', fallbackPrice);
            aiResult = { price: fallbackPrice };
          }
        }
        
        setEstimatedCost(aiResult.price);
        setShowPriceButton(true);
        setShowLoadingScreen(false);
        setPricing(false);
        
        // Save to database
        const user = auth.currentUser;
        if (user) {
          const diagnosisData = {
            userId: user.uid,
            category: selectedCategory,
            brand: brand,
            model: model,
            issueDescription: issueDescription,
            diagnosis: diagnosisResult,
            estimatedCost: aiResult.price,
            createdAt: new Date(),
            status: 'completed'
          };

          await addDoc(collection(db, 'diagnoses'), diagnosisData);
        }
        
        Alert.alert(
          'Price Estimation Complete',
          `Estimated cost: ₱${aiResult.price.toLocaleString()}\n\nWould you like to proceed with finding a technician?`,
          [
            { text: 'Maybe Later', onPress: () => {} },
            { 
              text: 'Find Technician', 
              onPress: async () => {
                const hasExistingAppointment = await checkExistingAppointment();
                
                if (hasExistingAppointment) {
                  return; // checkExistingAppointment already shows the appropriate alert
                }
                
                const diagnosisData = {
                  category: selectedCategory,
                  brand: brand,
                  model: model,
                  issue: selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue,
                  diagnosis: diagnosisResult,
                  estimatedCost: aiResult.price.toString(),
                  isCustomIssue: (selectedIssue === 'Others (please specify)').toString(),
                };
                
                router.push({
                  pathname: '/bookings',
                  params: diagnosisData
                });
              }
            }
          ]
        );
        
      } catch (error) {
        console.error('Error during price estimation:', error);
        setShowLoadingScreen(false);
        setPricing(false);
        Alert.alert('Error', 'Failed to estimate price');
      }
    }
  };

  const handleSubmit = async () => {
    // Check if user has unrated completed repairs
    try {
      const user = auth.currentUser;
      if (user) {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(appointmentsQuery);
        
        const hasUnratedCompleted = querySnapshot.docs.some(doc => {
          const appointment = doc.data();
          const status = appointment.status?.global || appointment.status;
          const isRated = appointment.status?.rated;
          console.log('🔍 Checking appointment:', doc.id, 'status:', status, 'rated:', isRated);
          return status === 'Completed' && !isRated;
        });
        
        console.log('🔍 Has unrated completed repairs:', hasUnratedCompleted);
        
        if (hasUnratedCompleted) {
          Alert.alert(
            'Complete Your Feedback',
            'Please complete your service feedback for the previous repair before booking a new one. Your feedback helps us maintain quality service.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for unrated repairs:', error);
    }

    if (!selectedCategory || !selectedIssue || !brand) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (selectedIssue === 'Others (please specify)' && !otherIssue.trim()) {
      Alert.alert('Error', 'Please specify the issue');
      return;
    }

    if (validationError) {
      Alert.alert('Invalid Input', validationError);
      return;
    }

    try {
      setSubmitting(true);
      setShowLoadingScreen(true);
      setLoadingStep(0);

      // Step 1: Diagnosing
      setLoadingStep(1);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds

      // Step 2: AI Price Estimation
      setLoadingStep(2);
      setIsUsingAI(true);
      
      try {
        // Use AI for all pricing calculations - Try Gemini first, then OpenAI
        const issueDescription = selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue;
        
        let aiResult;
        try {
          // Try Gemini first (better rate limits)
          aiResult = await estimatePriceWithGemini(selectedCategory, issueDescription, brand, model);
          console.log('Using Gemini AI for pricing');
        } catch (geminiError) {
          console.log('Gemini failed, trying Groq:', geminiError);
          // Fallback to Groq
          aiResult = await estimatePriceWithGroq(selectedCategory, issueDescription, brand, model);
          console.log('Using Groq for pricing');
        }
        
        setEstimatedCost(aiResult.price);
      } catch (error) {
        console.log('AI estimation failed, using fallback system:', error);
        
        // Show user-friendly message for rate limits
        if (error instanceof Error && error.message.includes('Rate limit')) {
          console.log('Rate limit hit, using fallback pricing system');
        }
        
        // Fallback to keyword system for custom issues, predefined for known issues
        let fallbackPrice = 0;
        
        if (selectedIssue === 'Others (please specify)') {
          const result = estimateCustomIssuePrice(selectedCategory, otherIssue, brand);
          fallbackPrice = result.price;
        } else {
          const selectedIssueData = applianceData[selectedCategory as keyof typeof applianceData].issues.find(
            issue => issue.name === selectedIssue
          );
          fallbackPrice = selectedIssueData?.price || 0;
        }
        
        // Ensure we have a valid price
        if (fallbackPrice > 0) {
          setEstimatedCost(fallbackPrice);
        } else {
          // If still no price, use a default based on category
          const defaultPrices = {
            'Television': 2000,
            'Electric Fan': 500,
            'Air Conditioner': 3000,
            'Refrigerator': 2500,
            'Washing Machine': 1500
          };
          setEstimatedCost(defaultPrices[selectedCategory as keyof typeof defaultPrices] || 1000);
        }
      }
      setIsUsingAI(false);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const diagnosisData = {
        userId: user.uid,
        category: selectedCategory,
        brand: brand,
        issueDescription: selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue,
        findings: `Diagnosed issue: ${selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue}`,
        recommendation: 'Professional repair recommended',
        estimatedCost: estimatedCost,
        createdAt: new Date(),
        status: 'completed'
      };

      const docRef = await addDoc(collection(db, 'diagnoses'), diagnosisData);
      
      setShowLoadingScreen(false);
      
      // Auto-collapse all sections after successful submission
      setExpandedSections({
        category: false,
        issue: false,
        details: false
      });
      
      Alert.alert(
        'Diagnosis Complete',
        `Estimated cost: ₱${estimatedCost.toLocaleString()}\n\nWould you like to proceed with finding a technician?`,
        [
          { text: 'Maybe Later', onPress: () => {} },
          { 
            text: 'Find Technician', 
            onPress: async () => {
              const hasExistingAppointment = await checkExistingAppointment();
              
              if (hasExistingAppointment) {
                return; // checkExistingAppointment already shows the appropriate alert
              }
              
              const diagnosisData = {
                category: selectedCategory,
                brand: brand,
                model: model,
                issue: selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue,
                diagnosis: diagnosisResult,
                estimatedCost: estimatedCost.toString(),
                isCustomIssue: (selectedIssue === 'Others (please specify)').toString(),
                hasExisting: 'true'
              };
              
              router.push({
                pathname: '/bookings',
                params: diagnosisData
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      setShowLoadingScreen(false);
      Alert.alert('Error', 'Failed to save diagnosis');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading screen component
  const LoadingScreen = () => (
    <View style={diagnoseStyles.loadingOverlay}>
      <View style={diagnoseStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={diagnoseStyles.loadingText}>
          {loadingStep === 1 ? 'AI is analyzing your device and providing diagnosis...' : 
           loadingStep === 2 ? 'AI is calculating the repair cost...' : 
           'Processing...'}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={diagnoseStyles.container}
    >
      {showLoadingScreen && <LoadingScreen />}
      <ScrollView 
        style={diagnoseStyles.scrollView} 
        contentContainerStyle={diagnoseStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={diagnoseStyles.header}>
          <Text style={diagnoseStyles.title}>Device Diagnosis</Text>
          <Text style={diagnoseStyles.subtitle}>Get AI diagnosis and price estimate</Text>
        </View>

        {/* Category Selection Section */}
        <TouchableOpacity 
          style={getSectionButtonStyle('category')}
          onPress={() => toggleSection('category')}
        >
          <View style={diagnoseStyles.buttonContent}>
            <View style={diagnoseStyles.buttonLeft}>
              <View style={diagnoseStyles.iconContainer}>
                <Text style={diagnoseStyles.icon}>🔌</Text>
              </View>
              <View style={diagnoseStyles.textContainer}>
                <Text style={diagnoseStyles.buttonTitle}>Select Appliance</Text>
                <Text style={diagnoseStyles.buttonSubtitle}>
                  {selectedCategory || 'Choose your device category'}
                </Text>
              </View>
            </View>
            <Text style={diagnoseStyles.arrow}>
              {expandedSections.category ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.category && (
          <View style={diagnoseStyles.expandedContent}>
            {Object.keys(applianceData).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  diagnoseStyles.optionButton,
                  selectedCategory === category && diagnoseStyles.selectedOptionButton
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={[
                  diagnoseStyles.optionButtonText,
                  selectedCategory === category && diagnoseStyles.selectedOptionButtonText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Device Details Section */}
        <TouchableOpacity 
          style={getSectionButtonStyle('details')}
          onPress={() => toggleSection('details')}
        >
          <View style={diagnoseStyles.buttonContent}>
            <View style={diagnoseStyles.buttonLeft}>
              <View style={diagnoseStyles.iconContainer}>
                <Text style={diagnoseStyles.icon}>📝</Text>
              </View>
              <View style={diagnoseStyles.textContainer}>
                <Text style={diagnoseStyles.buttonTitle}>Device Details</Text>
                <Text style={diagnoseStyles.buttonSubtitle}>
                  {brand ? `${brand} - ${selectedCategory}` : 'Enter device information'}
                </Text>
              </View>
            </View>
            <Text style={diagnoseStyles.arrow}>
              {expandedSections.details ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.details && (
          <View style={diagnoseStyles.expandedContent}>
            {selectedCategory ? (
              <>
                <View style={diagnoseStyles.inputGroup}>
                  <Text style={diagnoseStyles.label}>Brand</Text>
                  <View style={[diagnoseStyles.pickerContainer, { marginTop: 8 }]}>
                    <Picker
                      selectedValue={brand}
                      onValueChange={handleBrandSelect}
                      mode="dropdown"
                      style={diagnoseStyles.picker}
                      dropdownIconColor="#666"
                    >
                      <Picker.Item label="Select Brand" value="" />
                      {selectedCategory && brandOptions[selectedCategory as keyof typeof brandOptions]?.map((brandOption) => (
                        <Picker.Item key={brandOption} label={brandOption} value={brandOption} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={diagnoseStyles.inputGroup}>
                  <View style={diagnoseStyles.labelContainer}>
                    <Text style={diagnoseStyles.label}>Model (Recommended for better accuracy)</Text>
                    <TouchableOpacity 
                      style={diagnoseStyles.helpButton}
                      onPress={() => setShowModelHelp(true)}
                    >
                      <Text style={diagnoseStyles.helpButtonText}>?</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={diagnoseStyles.input}
                    placeholder="Enter appliance model (e.g., QN65Q80TAFXZA, C1, X90J)"
                    value={model}
                    onChangeText={handleModelChange}
                    placeholderTextColor="#999"
                  />
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', fontStyle: 'italic', padding: 20 }}>Please select an appliance category first</Text>
            )}
          </View>
        )}

        {/* Issue Selection Section */}
        <TouchableOpacity 
          style={getSectionButtonStyle('issue')}
          onPress={() => toggleSection('issue')}
        >
          <View style={diagnoseStyles.buttonContent}>
            <View style={diagnoseStyles.buttonLeft}>
              <View style={diagnoseStyles.iconContainer}>
                <Text style={diagnoseStyles.icon}>🔧</Text>
              </View>
              <View style={diagnoseStyles.textContainer}>
                <Text style={diagnoseStyles.buttonTitle}>Select Issue</Text>
                <Text style={diagnoseStyles.buttonSubtitle}>
                  {selectedIssue || 'Choose the problem with your device'}
                </Text>
              </View>
            </View>
            <Text style={diagnoseStyles.arrow}>
              {expandedSections.issue ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.issue && (
          <View style={diagnoseStyles.expandedContent}>
            {selectedCategory ? applianceData[selectedCategory as keyof typeof applianceData].issues.map((issue, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  diagnoseStyles.optionButton,
                  selectedIssue === issue.name && diagnoseStyles.selectedOptionButton
                ]}
                onPress={() => handleIssueSelect(issue)}
              >
                <Text style={[
                  diagnoseStyles.optionButtonText,
                  selectedIssue === issue.name && diagnoseStyles.selectedOptionButtonText
                ]}>
                  {issue.name}
                  {issue.isOther && (
                    <Text style={diagnoseStyles.aiIndicator}> 🤖 AI</Text>
                  )}
                </Text>
              </TouchableOpacity>
            )) : (
              <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', fontStyle: 'italic', padding: 20 }}>Please select an appliance category first</Text>
            )}

            {selectedIssue === 'Others (please specify)' && (
              <View style={diagnoseStyles.inputGroup}>
                <Text style={diagnoseStyles.label}>Please specify the issue</Text>
                <Text style={diagnoseStyles.aiNote}>🤖 AI will analyze your description and provide diagnosis{'\n'}💡 Tip: Include brand/model in your description for better accuracy{'\n'}🔍 Diagnosis will be shown after clicking Diagnose button</Text>
                <TextInput
                  style={[
                    diagnoseStyles.input, 
                    diagnoseStyles.textArea,
                    validationError && diagnoseStyles.inputError
                  ]}
                  placeholder="Describe the issue... (e.g., 'Samsung TV screen is cracked' or 'LG aircon not cooling')"
                  value={otherIssue}
                  onChangeText={setOtherIssue}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
                {validationError ? (
                  <Text style={diagnoseStyles.errorText}>{validationError}</Text>
                ) : null}
              </View>
            )}
          </View>
        )}


        {/* Result Section */}
        {diagnosisResult && (
          <TouchableOpacity 
            style={getSectionButtonStyle('result')}
            onPress={() => toggleSection('result')}
          >
            <View style={diagnoseStyles.buttonContent}>
              <View style={diagnoseStyles.buttonLeft}>
                <View style={diagnoseStyles.iconContainer}>
                  <Text style={diagnoseStyles.icon}>🔍</Text>
                </View>
                <View style={diagnoseStyles.textContainer}>
                  <Text style={diagnoseStyles.buttonTitle}>Diagnosis Result</Text>
                  <Text style={diagnoseStyles.buttonSubtitle}>
                    {selectedIssue === 'Others (please specify)' ? 'View AI diagnosis findings' : 'View diagnosis findings'}
                  </Text>
                </View>
              </View>
              <Text style={diagnoseStyles.arrow}>
                {expandedSections.result ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {expandedSections.result && diagnosisResult && (
          <View style={diagnoseStyles.expandedContent}>
            <View style={diagnoseStyles.reviewContainer}>
              <Text style={diagnoseStyles.reviewLabel}>
                {selectedIssue === 'Others (please specify)' ? 'AI Diagnosis:' : 'Diagnosis:'}
              </Text>
              <Text style={[diagnoseStyles.reviewValue, { marginTop: 8, lineHeight: 24 }]}>
                {diagnosisResult}
              </Text>
            </View>
          </View>
        )}

        {/* View Price Button - Only show after price estimation */}
        {showPriceButton && estimatedCost > 0 && (
          <TouchableOpacity 
            style={[
              diagnoseStyles.sectionButton,
              expandedSections.price && diagnoseStyles.sectionButtonExpanded
            ]}
            onPress={() => setExpandedSections(prev => ({ ...prev, price: !prev.price }))}
          >
            <View style={diagnoseStyles.buttonContent}>
              <View style={diagnoseStyles.buttonLeft}>
                <View style={diagnoseStyles.iconContainer}>
                  <Text style={diagnoseStyles.icon}>💰</Text>
                </View>
                <View style={diagnoseStyles.textContainer}>
                  <Text style={diagnoseStyles.buttonTitle}>View Price</Text>
                  <Text style={diagnoseStyles.buttonSubtitle}>
                    {selectedIssue === 'Others (please specify)' ? 'View AI price estimation' : 'View price estimation'}
                  </Text>
                </View>
              </View>
              <Text style={diagnoseStyles.arrow}>
                {expandedSections.price ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {expandedSections.price && estimatedCost > 0 && (
          <View style={diagnoseStyles.expandedContent}>
            <View style={diagnoseStyles.reviewContainer}>
              <Text style={diagnoseStyles.reviewLabel}>
                {selectedIssue === 'Others (please specify)' ? 'AI Price Estimation:' : 'Price Estimation:'}
              </Text>
              <Text style={[diagnoseStyles.reviewValue, { marginTop: 8, fontSize: 24, fontWeight: 'bold', color: '#2E7D32' }]}>
                ₱{estimatedCost.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Diagnose Button */}
        {!diagnosisResult && (
          <TouchableOpacity 
            style={diagnoseStyles.submitButton}
            onPress={handleDiagnosis}
            disabled={!selectedCategory || !selectedIssue || !brand || diagnosing}
          >
            {diagnosing ? (
              <View style={diagnoseStyles.buttonLoadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={diagnoseStyles.submitButtonText}>Diagnosing...</Text>
              </View>
            ) : (
              <Text style={diagnoseStyles.submitButtonText}>Diagnose</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Estimate Price Button */}
        {diagnosisResult && !showPriceButton && (
          <TouchableOpacity 
            style={[
              diagnoseStyles.submitButton, 
              { backgroundColor: '#007AFF', borderColor: '#0056CC' }
            ]}
            onPress={handlePriceEstimation}
            disabled={pricing}
          >
            {pricing ? (
              <View style={diagnoseStyles.buttonLoadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={diagnoseStyles.submitButtonText}>Estimating...</Text>
              </View>
            ) : (
              <Text style={diagnoseStyles.submitButtonText}>Estimate Price</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Find Technician Button - Only show when price is estimated and not viewing price */}
        {showPriceButton && estimatedCost > 0 && !expandedSections.price && (
          <TouchableOpacity 
            style={[diagnoseStyles.findTechnicianButton, { marginBottom: 15 }]}
            onPress={async () => {
              const hasExistingAppointment = await checkExistingAppointment();
              
              if (hasExistingAppointment) {
                return; // checkExistingAppointment already shows the appropriate alert
              }
              
              // Prepare diagnosis data to pass to bookings
              const diagnosisData = {
                category: selectedCategory,
                brand: brand,
                model: model,
                issue: selectedIssue === 'Others (please specify)' ? otherIssue : selectedIssue,
                diagnosis: diagnosisResult,
                estimatedCost: estimatedCost.toString(),
                isCustomIssue: (selectedIssue === 'Others (please specify)').toString()
              };
              
              console.log('Diagnose.tsx - Passing data to bookings:', diagnosisData);
              console.log('Diagnose.tsx - Data types:', {
                category: typeof diagnosisData.category,
                brand: typeof diagnosisData.brand,
                model: typeof diagnosisData.model,
                issue: typeof diagnosisData.issue,
                diagnosis: typeof diagnosisData.diagnosis,
                estimatedCost: typeof diagnosisData.estimatedCost,
                isCustomIssue: typeof diagnosisData.isCustomIssue
              });
              
              router.push({
                pathname: '/bookings',
                params: diagnosisData
              });
            }}
          >
            <Text style={diagnoseStyles.pinEmoji}>📍</Text>
            <Text style={diagnoseStyles.findTechnicianText}>Find Technician</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={diagnoseStyles.closeButton}
          onPress={() => router.push('/homepage')}
        >
          <Text style={diagnoseStyles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

        {/* Model Help Modal */}
        {showModelHelp && (
          <TouchableOpacity 
            style={diagnoseStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModelHelp(false)}
          >
            <View style={diagnoseStyles.modalContent}>
              <Image 
                source={require('../../assets/images/modelnumber.png')} 
                style={diagnoseStyles.helpImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Disclaimer - Fixed at bottom */}
        <Animated.View 
          style={[
            diagnoseStyles.disclaimerContainer,
            {
              transform: [{ translateX: slideAnim }],
              opacity: showDisclaimer ? 1 : 0,
            }
          ]}
        >
          <View style={diagnoseStyles.disclaimerWrapper}>
            <Image 
              source={require('../../assets/images/technician.png')} 
              style={diagnoseStyles.technicianImage}
            />
            <View style={diagnoseStyles.disclaimerCard}>
              <Text style={diagnoseStyles.disclaimerText}>
                The displayed price is only an estimate.{'\n'}Additional miscellaneous fees may apply.
              </Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Toggle Disclaimer Button - always visible */}
        <View style={diagnoseStyles.showDisclaimerContainer}>
          <TouchableOpacity 
            style={diagnoseStyles.showDisclaimerButton}
            onPress={() => setShowDisclaimer(!showDisclaimer)}
          >
            <View style={diagnoseStyles.infoIconCircle}>
              <Text style={diagnoseStyles.infoIconText}>{showDisclaimer ? '×' : 'i'}</Text>
            </View>
          </TouchableOpacity>
        </View>
    </LinearGradient>
  );
}

