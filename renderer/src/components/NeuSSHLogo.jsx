import React from 'react';

const NeuSSHLogo = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    default: 'w-10 h-10 text-base',
    large: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl'
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
        tracking-tighter
        select-none
        shadow-lg
        shadow-neussh-900/30
        ${className}
      `}
      style={{ fontFamily: "'Inter', 'JetBrains Mono', sans-serif" }}
    >
      <span>NShell</span>
    </div>
  );
};

export default NeuSSHLogo;
