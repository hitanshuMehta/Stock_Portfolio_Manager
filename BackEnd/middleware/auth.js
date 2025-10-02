// import jwt from 'jsonwebtoken';

// export const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ 
//       error: 'Access token required',
//       code: 'TOKEN_REQUIRED'
//     });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       // Check if token expired
//       if (err.name === 'TokenExpiredError') {
//         return res.status(401).json({ 
//           error: 'Token expired',
//           code: 'TOKEN_EXPIRED'
//         });
//       }
      
//       return res.status(403).json({ 
//         error: 'Invalid token',
//         code: 'TOKEN_INVALID'
//       });
//     }
    
//     req.user = user;
//     next();
//   });
// };

// // Optional: Middleware to check if user exists in database
// export const authenticateUser = async (req, res, next) => {
//   try {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) {
//       return res.status(401).json({ 
//         error: 'Access token required',
//         code: 'TOKEN_REQUIRED'
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // You can add database check here if needed
//     // const user = await User.findById(decoded.userId);
//     // if (!user) {
//     //   return res.status(401).json({ error: 'User not found' });
//     // }
    
//     req.user = decoded;
//     next();
//   } catch (err) {
//     if (err.name === 'TokenExpiredError') {
//       return res.status(401).json({ 
//         error: 'Token expired',
//         code: 'TOKEN_EXPIRED'
//       });
//     }
    
//     return res.status(403).json({ 
//       error: 'Invalid token',
//       code: 'TOKEN_INVALID'
//     });
//   }
// };


import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn(`⚠ Token missing for ${req.method} ${req.path}`);
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Check if token expired
      if (err.name === 'TokenExpiredError') {
        console.warn(`⚠ Token expired for ${req.method} ${req.path}`);
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      console.warn(`⚠ Invalid token for ${req.method} ${req.path}:`, err.message);
      return res.status(403).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    req.user = user;
    console.log(`✓ Authenticated user: ${user.email || user.userId} for ${req.method} ${req.path}`);
    next();
  });
};

// Optional: Middleware to check if user exists in database
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.warn(`⚠ Token missing for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // You can add database check here if needed
    // const user = await User.findById(decoded.userId);
    // if (!user) {
    //   return res.status(401).json({ error: 'User not found' });
    // }
    
    req.user = decoded;
    console.log(`✓ Authenticated user: ${decoded.email || decoded.userId} for ${req.method} ${req.path}`);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn(`⚠ Token expired for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.warn(`⚠ Invalid token for ${req.method} ${req.path}:`, err.message);
    return res.status(403).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Optional: Admin role check middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    console.warn(`⚠ Access denied: User ${req.user.email || req.user.userId} is not admin`);
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};