const AdminModel = require('../models/Admin/Admin')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const UserModel = require('../models/User/User')
const CompanyModel = require('../models/Company/Company')
const RestaurantModel = require('../models/Restaurant/Restaurant')
const FeatureModel = require('../models/Company/Feature')
const parser = require('ua-parser-js')
const OrderModel = require('../models/Restaurant/Order')
const ProductModel = require('../models/Restaurant/Product')
// const { resetPassword } = require("../Emails/ResetPassword/resetPassword");

exports.login = async (req, res) => {
    try {
        const { userName, password } = req.body
        if (!userName) {
            return res.status(400).send({
                message: 'Please provide a valid user !',
                code: 400,
                requestDate: Date.now(),
                success: false,
            })
        }
        const foundAdmin = await AdminModel.findOne({
            email: userName,
            isArchived: false,
            isActive: true,
        })
        const ua = parser(req.headers['user-agent'])

        if (!foundAdmin) {
            return res.status(404).send({
                message:
                    'This user dosent exist in the database , please verify and send again',
                code: 404,
                requestDate: Date.now(),
                success: false,
            })
        }
        if (!foundAdmin.isActive)
            return res.status(401).send({
                message:
                    'Your account has been disabled. Please contact support for more informations.',
                code: 401,
                requestDate: Date.now(),
                success: false,
            })
        bcrypt.compare(password, foundAdmin.password, async (err, data) => {
            //if error than throw error
            if (err) throw err

            //if both match than you can do anything
            if (data) {
                foundAdmin.loginHistory.push({
                    date: Date.now(),
                    device: ua,
                    ip: req.ip,
                    success: true,
                })

                const token = jwt.sign(
                    {
                        id: foundAdmin.id,
                        email: userName,
                        role: foundAdmin.role,
                    },
                    process.env.SECRET_KEY,
                    {
                        expiresIn: '30d',
                    }
                )
                foundAdmin.save()

                return res.status(200).json({
                    message: 'Login success',
                    code: 200,
                    success: true,
                    date: Date.now(),
                    token,
                })
            } else {
                foundAdmin.loginHistory.push({
                    date: Date.now(),
                    device: ua,
                    ip: req.ip,
                    success: false,
                })
                await foundAdmin.save()

                return res.status(401).json({
                    message: 'Invalid credential',
                    code: 401,
                    success: false,
                })
            }
        })
    } catch (err) {
        res.status(500).send({
            message:
                'This error is coming from login endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.createAdmin = async (req, res) => {
    try {
        const { name, surname, email, password, role } = req.body
        if (!name || !password || !email || !surname || !role) {
            return res.status(400).send({
                message: 'Missing informations , please verify and try again',
                code: 400,
                success: false,
                date: Date.now(),
            })
        }

        const foundAdmin = await AdminModel.findOne({
            email,
        })
        if (foundAdmin) {
            return res.status(400).send({
                message: 'The user already exist , please use another email',
                code: 400,
                success: false,
                date: Date.now(),
            })
        }
        const authPassword = await bcrypt.hash(password, 10)

        const Admin = new AdminModel({
            id: uuidv4(),
            name,
            surname,
            email,
            role,
            password: authPassword,
        })
        await Admin.save()

        return res.status(200).send({
            message: 'Admin created successfuly',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (err) {
        res.status(500).send({
            message:
                'This error is coming from createAdmin endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.viewProfile = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)
        let foundAdmin = await AdminModel.findOne({ id: user.id }).select(
            '-password -loginHistory -__v -_id -isActive -isArchived'
        )
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        res.status(200).send({
            message: 'Fetched profile',
            code: 200,
            success: true,
            date: Date.now(),
            data: foundAdmin,
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from viewProfile endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.editProfile = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)
        const values = req.body

        if (values.email) {
            const foundEmail = await AdminModel.findOne({ email: values.email })
            if (foundEmail)
                return res.status(406).send({
                    message: 'Email already in use',
                    code: 406,
                    success: false,
                    date: Date.now(),
                })
        }

        const foundAdmin = await AdminModel.findOneAndUpdate(
            {
                id: user.id,
            },
            { $set: values },
            { new: true }
        )
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        res.status(200).send({
            message: 'Updated profile details',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from editProfile endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.changePassword = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)
        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const { newPassword, currentPassword, confirmNewPassword } = req.body
        if (newPassword === confirmNewPassword) {
            const testCurrentPass = await bcrypt.compare(
                currentPassword,
                foundAdmin.password
            )
            if (testCurrentPass) {
                const testNewPass = await bcrypt.compare(
                    newPassword,
                    foundAdmin.password
                )
                if (!testNewPass) {
                    foundAdmin.password = await bcrypt.hash(newPassword, 10)
                    foundAdmin.save()
                    res.status(200).send({
                        code: 200,
                        message: 'Password changed successfully',
                        success: true,
                        date: Date.now(),
                    })
                } else {
                    res.status(406).send({
                        code: 406,
                        message: 'Your new password cannot be your old one',
                        success: false,
                        date: Date.now(),
                    })
                }
            } else {
                res.status(406).send({
                    code: 406,
                    message: "Password doesn't match your current one",
                    success: false,
                    date: Date.now(),
                })
            }
        } else {
            res.status(406).send({
                code: 406,
                message: "Your new passwords don't match",
                success: false,
                date: Date.now(),
            })
        }
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from changePassword endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.getCompanies = async (req, res) => {
    try {
        // const token = req.headers["x-order-token"];
        // const user = jwt.verify(token, process.env.SECRET_KEY);

        // const foundAdmin = await AdminModel.findOne({
        //   id: user.id,
        // });
        // if (!foundAdmin) {
        //   return res.status(404).send({
        //     message: "Admin not found",
        //     code: 404,
        //     success: false,
        //     date: Date.now(),
        //   });
        // }

        const foundCompanies = await CompanyModel.find({
            isArchived: false,
        }).select('-__v -_id ')

        res.status(200).send({
            message: 'Fetched companies.',
            code: 200,
            success: true,
            date: Date.now(),
            data: foundCompanies,
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message:
                'This error is coming from getCompanies endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.createCompany = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)

        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const { name, address, email, image, type, matricule, password } =
            req.body

        const foundCompany = await CompanyModel.findOne({
            email,
        })
        if (foundCompany) {
            return res.status(406).send({
                message: 'A company with this email already exists.',
                code: 406,
                success: false,
                date: Date.now(),
            })
        }
        const authPassword = await bcrypt.hash(password, 10)

        let newCompany = new CompanyModel({
            id: uuidv4(),
            name,
            address,
            email,
            image,
            type,
            matricule,
            password: authPassword,
        })
        await newCompany.save()
        res.status(200).send({
            message: 'Created company',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from createCompany endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.viewCompany = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)

        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const id = req.params['id']

        let foundCompany = await CompanyModel.findOne({
            id,
        }).select('-__v -_id ')
        if (!foundCompany) {
            return res.status(404).send({
                message: 'Company not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }

        res.status(200).send({
            message: 'Fetched company.',
            code: 200,
            success: true,
            date: Date.now(),
            data: foundCompany,
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from viewCompany endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.editCompany = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)

        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const id = req.params['id']
        let values = req.body

        const foundCompany = await CompanyModel.findOneAndUpdate(
            {
                id,
            },
            { $set: values },
            { new: true }
        )
        if (!foundCompany) {
            return res.status(404).send({
                message: 'Company not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        res.status(200).send({
            message: 'Updated company.',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from editCompany endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.udpateCompany = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)

        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const id = req.params['id']

        const foundCompany = await CompanyModel.findOne({
            id,
        })
        if (!foundCompany) {
            return res.status(404).send({
                message: 'Company not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        if (req.body.type === 'delete') {
            foundCompany.isArchived = !foundCompany.isArchived
        } else if (req.body.type === 'deactivate') {
            foundCompany.isActive = !foundCompany.isActive
        } else {
            return res.status(406).send({
                message: 'Invalid action type',
                code: 406,
                success: false,
                date: Date.now(),
            })
        }
        await foundCompany.save()
        res.status(200).send({
            message: 'Updated company.',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from udpateCompany endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.createUser = async (req, res) => {
    try {
        const token = req.headers['x-order-token']
        const user = jwt.verify(token, process.env.SECRET_KEY)

        const foundAdmin = await AdminModel.findOne({
            id: user.id,
        })
        if (!foundAdmin) {
            return res.status(404).send({
                message: 'Admin not found',
                code: 404,
                success: false,
                date: Date.now(),
            })
        }
        const {
            name,
            surname,
            email,
            phone,
            photo,
            role,
            password,
            idCompany,
        } = req.body
        if (email) {
            const foundEmail = await UserModel.findOne({
                email,
                isArchived: false,
            })
            if (foundEmail)
                return res.status(401).send({
                    message: 'Email already exists',
                    code: 401,
                    success: false,
                    date: Date.now(),
                })
        }

        const foundCompany = await CompanyModel.findOne({
            id: idCompany,
            isArchived: false,
            isActive: true,
        })
        if (!foundCompany)
            return res.status(404).send({
                message: 'Company not found',
                code: 404,
                success: false,
                date: Date.now(),
            })

        const authPassword = await bcrypt.hash(password, 10)
        const idUser = uuidv4()
        let newUser = new UserModel({
            id: idUser,
            name,
            surname,
            email,
            phone,
            photo,
            role,
            password,
            idCompany,
            password: authPassword,
        })
        foundCompany.users.push(idUser)
        await newUser.save()
        await foundCompany.save()
        res.status(200).send({
            message: 'Created user',
            code: 200,
            success: true,
            date: Date.now(),
        })
    } catch (error) {
        res.status(500).send({
            message:
                'This error is coming from createUser endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.getOrders = async (req, res) => {
    try {
        const foundOrders = await OrderModel.find().select('-__v -_id ')

        res.status(200).send({
            message: 'Fetched orders.',
            code: 200,
            success: true,
            date: Date.now(),
            data: foundOrders,
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message:
                'This error is coming from getOrders endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}
exports.getOrder = async (req, res) => {
    const { id } = req.params
    try {
        const foundOrder = await OrderModel.findOne({ id }).select('-__v -_id ')

        res.status(200).send({
            message: 'Fetched companies.',
            code: 200,
            success: true,
            date: Date.now(),
            data: foundOrder,
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message:
                'This error is coming from getOrder endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}

exports.allUsers = async (req, res) => {
    try {
        const FoundUsers = await UserModel.find().select('-__v -_id ')
        res.status(200).send({
            message: 'Fetched Users.',
            code: 200,
            success: true,
            date: Date.now(),
            data: FoundUsers,
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message:
                'This error is coming from allUsers endpoint, please report to the sys administrator !',
            code: 500,
            success: false,
            date: Date.now(),
        })
    }
}
exports.getProducts = async (req, res) => {
  try {
      const FoundProducts = await ProductModel.find().select('-__v -_id ')
      res.status(200).send({
          message: 'Fetched Products.',
          code: 200,
          success: true,
          date: Date.now(),
          data: FoundProducts,
      })
  } catch (error) {
      console.log(error)
      res.status(500).send({
          message:
              'This error is coming from FoundProducts endpoint, please report to the sys administrator !',
          code: 500,
          success: false,
          date: Date.now(),
      })
  }
}
