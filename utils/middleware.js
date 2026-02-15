import jwt from "jsonwebtoken"

const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).send('access denied , no token found');

    try {
        const decoded = jwt.verify(token, 'ABCDEFGH');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('invalid token.');
    }
};

export default verifyToken;