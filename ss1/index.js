const express = require('express')
const app = express()


app.use(express.json())
app.use(express.urlencoded({extended: true}))


app.set('view engine', 'pug')
app.use('/public', express.static(__dirname + '/public'))


const cookieParser = require('cookie-parser')
app.use(cookieParser())


const db = require('./db')
const bcrypt = require('bcrypt')


// FUNCTIONS
async function init() {
    await db.connect()
    global.basedir = __dirname

    // CHANGE PORT HERE
    app.listen(5600, () => console.log('Listening on port 5600...'))
}


function isEmp(object) {
    return Object.keys(object).length === 0
}


async function findUser(req) {
    return await db.get().collection('users').findOne({id: Number(req.cookies.id)}, {projection: {type: 1}})
}

// INITIALIZE
init()


// DIRECT ROUTES
app.get('/', (req, res) => {
    return res.redirect('/login')
})


app.use('/login', async (req, res, next) => {
    if (!isEmp(req.cookies)) {
        const user = await findUser(req)

        if (user.type === 0)
            return res.redirect('/admin')
        else
            return res.redirect('/teacher')
    }
    next()
})


app.get('/login', (req, res) => {
    let msg = null
    switch(Number(req.query.err)) {
        case 0:
            msg = 'The account does not exist.'
            break
        case 1:
            msg = 'Wrong password.'
            break
        case 2:
            msg = 'You have not logged in.'
            break
    }

    res.render('login', {msg: msg})
})


app.post('/login', async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    const existedUser = await db.get().collection('users').findOne({email: email})
    
    if (!existedUser)
        return res.redirect('/login?err=0')

    const correctPassword = await bcrypt.compare(password, existedUser.password)

    if (!correctPassword)
        return res.redirect('/login?err=1')

    res.cookie('id', existedUser.id)
    return res.redirect('/login')
})


app.post('/logout', (req, res) => {
    res.clearCookie('id')
    res.redirect('/login')
})


// ROUTER : ADMIN
const admin = require('./routes/admin')


app.use('/admin', async (req, res, next) => {
    if (isEmp(req.cookies))
        return res.redirect('/login?err=2')

    const user = await findUser(req)

    if (user.type === 0)
        next()
    else
        res.send('No permission to access.')
}, admin)


// ROUTER : TEACHER
const teacher = require('./routes/teacher')


app.use('/teacher', async (req, res, next) => {
    if (isEmp(req.cookies))
        return res.redirect('/login?err=2')

    const user = await findUser(req)

    if (user.type === 1)
        next()
    else
        res.send('No permission to access.')
}, teacher)