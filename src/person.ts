export interface Person {
  name: string;
}

export class MyPerson implements Person {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
