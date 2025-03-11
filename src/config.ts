type Printer = {
  host: string;
  workCenters?: string[];
};

// the first printer is the default printer by convention
const config: { printers: Printer[] } = {
  printers: [
    {
      host: '192.168.1.100',
      workCenters: [
        '1',
        '2',
        '3',
      ]
    },
    {
      host: '192.168.1.101',
      workCenters: [
        '4',
        '5',
        '6',
      ]
    },
  ],
};

export default config;