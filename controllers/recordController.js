const Record = require("../models/Record");

exports.getRecords = async (req, res) => {
  const { page = 1, status, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { cid: new RegExp(search, "i") },
      { trustedFormUrl: new RegExp(search, "i") }
    ];
  }

  const data = await Record.find(query)
    .skip((page - 1) * 20)
    .limit(20);

  res.json(data);
};