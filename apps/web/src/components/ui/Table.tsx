import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => {
  return (
    <div className="table-custom-wrapper">
      <div className="overflow-x-auto">
        <table className={`table-custom ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};
