import React from 'react';

const NeuSSHLogoSVG = ({ size = 40, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect 
        x="5" 
        y="5" 
        width="90" 
        height="90" 
        rx="20" 
        fill="#0284c7"
      />
      <text 
        x="50" 
        y="65" 
        textAnchor="middle" 
        fontFamily="'Inter', 'JetBrains Mono', sans-serif" 
        fontWeight="bold" 
        fontSize="42"
        fill="white"
      >
        <tspan fill="#ffffff">N</tspan>
        <tspan fill="#bae6fd" fontSize="38">SH</tspan>
      </text>
    </svg>
  );
};

export default NeuSSHLogoSVG;
