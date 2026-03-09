export default function handler(req, res) {
  const secret = process.env.ADMIN_SECRET || ''
  return res.status(200).json({
    admin_secret_length: secret.length,
    admin_secret_first2: secret.slice(0, 2),   // chỉ hiện 2 ký tự đầu
    admin_secret_last2:  secret.slice(-2),      // chỉ hiện 2 ký tự cuối
    admin_secret_set:    !!secret,
    node_env:            process.env.NODE_ENV,
  })
}
