import { matchedData } from 'express-validator';
import {
    loginUser,
    registerUser,
    adminRegister
} from '../services/auth.service.js';

const register = async (req, res) => {
    const input = matchedData(req, {
        locations: ['body'],
    });

    const user = await registerUser(
        req.body,
        {
            ip: req.ip,
        },
    );

    res.status(201).json({
        status: 'success',
        data: {
            user,
        },
    });
};

const login = async (req, res) => {
    const input = matchedData(req, {
        locations: ['body'],
    });

    const result = await loginUser(
        req.body,
        {
            ip: req.ip
        }
    );

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const getCurrentUser = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user,
        },
    });
};

const registerAdmin = async (req, res) => {
    const input = matchedData(req, {
        locations: ['body'],
    });

    const user = await adminRegister(
        req.body,
        {
            ip: req.ip,
        },
    );

    res.status(201).json({
        status: 'success',
        data: {
            user,
        },
    });
};

export {
    register,
    login,
    getCurrentUser,
    registerAdmin
};