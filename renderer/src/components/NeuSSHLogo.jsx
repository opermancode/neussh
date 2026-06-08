import React from 'react';

const NeuSSHLogo = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    default: 'w-10 h-10 text-xl',
    large: 'w-16 h-16 text-3xl',
    xl: 'w-20 h-20 text-4xl'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size] || sizeClasses.default}
        bg-neussh-600 
        rounded-xl 
        flex 
        items-center 
        justify-center 
        font-bold 
        text-white 
        tracking-tight
        select-none
        shadow-lg
        shadow-neussh-900/30
        ${className}
      `}
      style={{ fontFamily: "'Inter', 'JetBrains Mono', sans-serif" }}
    >
      <span className="relative">
        <span className="text-white">N</span>
        <span className="text-neussh-200">SH</span>
      </span>
    </div>
  );
};

export default NeuSSHLogo;
