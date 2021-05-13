const express = require('express')
const router = express.Router()


const bcrypt = require('bcrypt')
const sharp = require('sharp')


const fs = require('fs')
const db = require('../db')


const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, global.basedir + '/public/pics/tmp')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.substring(file.mimetype.indexOf('/') + 1)
        cb(null, Date.now() + '.' + ext)
    }
})  
const upload = multer({storage: storage})


// FUNCTIONS
async function findUser(id) {
    return await db.get().collection('users').findOne({id: id});
}


//DIRECT ROUTES

router.get('/', (req, res) => {
    return res.redirect('/teacher/view')
})


router.get('/view', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    switch(Number(req.query.suc)) {
        case 0:
            msg = 'Success in edit info.'
            break
        case 1:
            msg = 'Success in edit picture.'
            break
    }

    return res.render('common/view', {title: 'Teacher / View', user: user, msg: msg})
})


router.get('/edit/info', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    if (req.query.err)
        msg = 'Duplicated Email.'

    return res.render('common/editInfo', {title: 'Teacher / Edit Info', user: user, msg: msg})
})


router.post('/edit/info/:id', async (req, res) => {
    const email = req.body.email
    const id = Number(req.params.id)

    const duplicateEmail = await db.get().collection('users').findOne({id: {$ne: id}, email: email})

    if (duplicateEmail)
        return res.redirect('/teacher/edit/info?err=0')

    const name = req.body.name
    
    let updates = null;
    if (req.body.password) {
        const newPassword = await bcrypt.hash(req.body.password, 10)
        updates = {
            $set: {
                name: name,
                email: email,
                password: newPassword
            }
        }
    } else
        updates = {
            $set: {
                name: name,
                email: email
            }
        }

    const updatedDoc = await db.get().collection('users').findOneAndUpdate({id: id}, updates)

    if (updatedDoc.ok === 1)
        return res.redirect('/teacher/view?suc=0')
})


router.get('/edit/picture', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    switch(Number(req.query.err)) {
        case 0:
            msg = 'No file was provided.'
            break
        case 1:
            msg = 'Wrong extension of file.'
            break
    }

    return res.render('common/editPicture', {title: 'Teacher / Edit Picture', user: user, msg: msg})
})


router.post('/edit/picture/:id', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file)
        return res.redirect('/teacher/edit/picture?err=0')

    if (file.mimetype !== 'image/jpeg') {
        fs.unlink(global.basedir + '/public/pics/tmp/' + file.filename, (err) => {if (err) throw err})
        return res.redirect('/teacher/edit/picture?err=1')
    }

    await sharp(file.path)
        .resize(250, 250)
        .toFile(global.basedir +  '/public/pics/save/' + file.filename, async () => {
            const id = Number(req.params.id)
            const updatedDoc = await db.get().collection('users').findOneAndUpdate(
                {
                    id: id
                }, 
                {
                    $set: {
                        pic: file.filename
                    }
                }
            )

            fs.unlink(global.basedir + '/public/pics/tmp/' + file.filename, (err) => {if (err) throw err})

            if (updatedDoc.ok === 1)
                res.redirect('/teacher/view?suc=1')
        })
})


// APPOINTMENT VIEW

router.get('/appoint', async (req, res) => {
    const getToday = () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();

        const stoday = yyyy + '-' + mm + '-' + dd
        return stoday
    }

    const setMark = (d, today) => {
        if (d === today)
            return 1
        
        const d_obj = new Date(d)
        const today_obj = new Date(today)

        if (d_obj < today_obj)
            return 0
        else
            return 2
    }

    const id = Number(req.cookies.id)
    const user = await findUser(id)

    const appoints = []
    const appointCursor = await db.get().collection('appoints').find({teacherId: id})

    while (await appointCursor.hasNext()) {
        const appoint = await appointCursor.next()
        appoints.push(appoint)
    }

    const today = getToday()
    for (const appoint of appoints)
        appoint['mark'] = setMark(appoint.date, today)

    return res.render('teacher/appoint', {
        user: user,
        appoints: appoints
    })
})



module.exports = router