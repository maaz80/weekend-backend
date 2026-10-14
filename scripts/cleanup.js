import 'dotenv/config';
import mongoose from 'mongoose';
import UnifiedConversation from '../models/UnifiedConversation.js';
import UnifiedMessage from '../models/UnifiedMessage.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const seedIds = ['ig_user_101', 'ankit.verma.dev@gmail.com', 'test_live_sender_entry'];
  for (const uid of seedIds) {
    const conv = await UnifiedConversation.findOne({ externalUserId: uid });
    if (conv) {
      await UnifiedMessage.deleteMany({ conversationId: conv._id });
      await UnifiedConversation.findByIdAndDelete(conv._id);
      console.log('Deleted mock conversation:', conv.senderName, uid);
    }
  }

  const maazConv = await UnifiedConversation.findOne({ externalUserId: '1108869845462320' });
  if (maazConv) {
    maazConv.senderName = 'Maaz Shakeel';
    maazConv.senderHandle = '@maaz_ms_01_';
    maazConv.avatar = 'https://instagram.fknu1-5.fna.fbcdn.net/v/t51.82787-19/670275881_18310431190272085_3780657860324910852_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=62EHdiGf1eMQ7kNvwHp33ux&_nc_oc=AdqNk9xkEfqZT9qLlyeXgUY1S4ZW3KzIRRiFoD8diuPJyPvJutER3tSztKCqk4d1m6w&_nc_zt=24&_nc_ht=instagram.fknu1-5.fna&edm=ALmAK4EEAAAA&_nc_gid=C1EDzhBWq_xnAcMXXtnuAg&oh=00_AQN7etQ2eKAS73LbhiMREbmVWFOVStIcpkyuYAqt0pumeg&oe=6AD3E27C';
    await maazConv.save();
    console.log('Updated Maaz profile in DB:', maazConv.senderName, maazConv.senderHandle);
  }

  const all = await UnifiedConversation.find().lean();
  console.log('Current remaining conversations:', all.map(a => ({ id: a._id, name: a.senderName, handle: a.senderHandle })));
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
