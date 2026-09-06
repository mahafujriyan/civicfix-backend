import { PrismaClient, Role, Priority, ComplaintStatus, AuthProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.info('Seeding CivicFix database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.complaintStatusHistory.deleteMany();
  await prisma.complaintAssignment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.location.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const staffPassword = process.env.SEED_STAFF_PASSWORD || 'Staff@12345';
  const citizenPassword = process.env.SEED_CITIZEN_PASSWORD || 'Citizen@12345';

  const departments = await Promise.all(
    [
      {
        name: 'Road & Transport',
        description: 'Roads, traffic, and transport infrastructure',
      },
      {
        name: 'Waste Management',
        description: 'Garbage collection and sanitation',
      },
      {
        name: 'Water & Drainage',
        description: 'Water supply and drainage systems',
      },
      {
        name: 'Electricity',
        description: 'Street lights and electrical issues',
      },
      {
        name: 'Public Safety',
        description: 'Public safety and security concerns',
      },
    ].map((dept) => prisma.department.create({ data: dept })),
  );

  const [roadDept, wasteDept, waterDept, electricityDept] = departments;

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Road Damage',
        description: 'Potholes, broken roads, damaged pavements',
        departmentId: roadDept.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Garbage Collection',
        description: 'Missed pickup or overflowing bins',
        departmentId: wasteDept.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Water Leakage',
        description: 'Pipe leaks and water wastage',
        departmentId: waterDept.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Street Light',
        description: 'Non-functional or damaged street lights',
        departmentId: electricityDept.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Drainage Problem',
        description: 'Blocked or overflowing drains',
        departmentId: waterDept.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Illegal Dumping',
        description: 'Unauthorized waste dumping',
        departmentId: wasteDept.id,
      },
    }),
  ]);

  const admin = await prisma.user.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@civicfix.local',
      fullName: 'CivicFix Admin',
      phone: '+8801700000001',
      role: Role.ADMIN,
      provider: AuthProvider.LOCAL,
      passwordHash: await hash(adminPassword),
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      email: 'staff1@civicfix.local',
      fullName: 'Rahim Uddin',
      phone: '+8801700000002',
      role: Role.STAFF,
      provider: AuthProvider.LOCAL,
      passwordHash: await hash(staffPassword),
      departmentId: roadDept.id,
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@civicfix.local',
      fullName: 'Karim Hossain',
      phone: '+8801700000003',
      role: Role.STAFF,
      provider: AuthProvider.LOCAL,
      passwordHash: await hash(staffPassword),
      departmentId: wasteDept.id,
    },
  });

  const citizen1 = await prisma.user.create({
    data: {
      email: 'citizen1@civicfix.local',
      fullName: 'Fatima Akter',
      phone: '+8801700000004',
      role: Role.CITIZEN,
      provider: AuthProvider.LOCAL,
      passwordHash: await hash(citizenPassword),
    },
  });

  const citizen2 = await prisma.user.create({
    data: {
      email: 'citizen2@civicfix.local',
      fullName: 'Jamal Ahmed',
      phone: '+8801700000005',
      role: Role.CITIZEN,
      provider: AuthProvider.LOCAL,
      passwordHash: await hash(citizenPassword),
    },
  });

  const location1 = await prisma.location.create({
    data: {
      address: '12 Mirpur Road',
      city: 'Dhaka',
      area: 'Mirpur-10',
      latitude: 23.8067,
      longitude: 90.3686,
    },
  });

  const location2 = await prisma.location.create({
    data: {
      address: '45 Gulshan Avenue',
      city: 'Dhaka',
      area: 'Gulshan-2',
      latitude: 23.7925,
      longitude: 90.4078,
    },
  });

  const complaint1 = await prisma.complaint.create({
    data: {
      title: 'Large pothole near bus stop',
      description: 'A deep pothole is causing traffic and safety risks near the Mirpur bus stop.',
      priority: Priority.HIGH,
      status: ComplaintStatus.ASSIGNED,
      categoryId: categories[0].id,
      locationId: location1.id,
      createdById: citizen1.id,
      departmentId: roadDept.id,
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: ComplaintStatus.SUBMITTED,
            changedById: citizen1.id,
            note: 'Complaint submitted by citizen',
          },
          {
            fromStatus: ComplaintStatus.SUBMITTED,
            toStatus: ComplaintStatus.UNDER_REVIEW,
            changedById: admin.id,
            note: 'Under review by admin',
          },
          {
            fromStatus: ComplaintStatus.UNDER_REVIEW,
            toStatus: ComplaintStatus.ASSIGNED,
            changedById: admin.id,
            note: 'Assigned to road department staff',
          },
        ],
      },
      assignments: {
        create: {
          staffId: staff1.id,
          assignedById: admin.id,
          notes: 'Please inspect and schedule repair',
          isActive: true,
        },
      },
    },
  });

  const complaint2 = await prisma.complaint.create({
    data: {
      title: 'Overflowing garbage bins',
      description: 'Community bins have not been emptied for several days.',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      categoryId: categories[1].id,
      locationId: location2.id,
      createdById: citizen2.id,
      departmentId: wasteDept.id,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: ComplaintStatus.SUBMITTED,
          changedById: citizen2.id,
          note: 'Complaint submitted by citizen',
        },
      },
    },
  });

  await prisma.comment.create({
    data: {
      complaintId: complaint1.id,
      authorId: staff1.id,
      content: 'Site visit scheduled for tomorrow morning.',
      isInternal: false,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: citizen1.id,
        complaintId: complaint1.id,
        title: 'Complaint assigned',
        message: 'Your complaint has been assigned to a staff member.',
      },
      {
        userId: staff1.id,
        complaintId: complaint1.id,
        title: 'New assignment',
        message: 'You have been assigned a new complaint.',
      },
      {
        userId: admin.id,
        complaintId: complaint2.id,
        title: 'New complaint',
        message: 'A new complaint requires review.',
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SEED_COMPLETED',
      entity: 'System',
      entityId: null,
      metadata: {
        complaints: [complaint1.id, complaint2.id],
        staff: [staff1.id, staff2.id],
        citizens: [citizen1.id, citizen2.id],
      },
    },
  });

  console.info('Seed completed successfully.');
  console.info('Demo credentials:');
  console.info(`  ADMIN   -> ${admin.email} / ${adminPassword}`);
  console.info(`  STAFF   -> ${staff1.email} / ${staffPassword}`);
  console.info(`  STAFF   -> ${staff2.email} / ${staffPassword}`);
  console.info(`  CITIZEN -> ${citizen1.email} / ${citizenPassword}`);
  console.info(`  CITIZEN -> ${citizen2.email} / ${citizenPassword}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
