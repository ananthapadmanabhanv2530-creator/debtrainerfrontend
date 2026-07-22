import { motion } from 'framer-motion';

const BentoGrid = ({ children, className = '', style = {} }) => {
  return (
    <div className={`bento-grid ${className}`} style={style}>
      {children}
    </div>
  );
};

const BentoCell = ({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = '',
  style = {},
  hoverScale = 1.01,
  ...props
}) => {
  return (
    <motion.div
      className={`bento-cell glass-card ${className}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        ...style,
      }}
      whileHover={{ scale: hoverScale, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

BentoGrid.Cell = BentoCell;
export default BentoGrid;
