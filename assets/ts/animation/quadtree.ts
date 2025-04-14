// Quadtree implementation for spatial partitioning
// This code is a TypeScript implementation of a quadtree data structure to efficiently manage 2D spatial data.
// It allows for inserting points, subdividing the space, and querying points within a specified range.

export interface Point<T> {
  x: number;
  y: number;
  data: T;
}

// This class represents a rectangle in 2D space.
// It is used to define the boundaries of the quadtree and to check if points are within these boundaries.
export class Rectangle {
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(point: Point<any>): boolean {
    return (
        point.x >= this.x - this.w &&
        point.x < this.x + this.w &&
        point.y >= this.y - this.h &&
        point.y < this.y + this.h
    );
  }

  intersects(range: Rectangle): boolean {
    return !(
        range.x - range.w > this.x + this.w ||
        range.x + range.w < this.x - this.w ||
        range.y - range.h > this.y + this.h ||
        range.y + range.h < this.y - this.h
    );
  }
}

// This class implements a quadtree data structure for spatial partitioning.
// its a method of dividing a 2D space into four quadrants or regions to efficiently manage and query spatial data.
// and allows recursive subdivision of those four quadrants of space into smaller regions, and so on. Makes computational tasks
// alot cheaper when dealing with large amounts of objects in a 2D space.
export class Quadtree<T> {
  boundary: Rectangle;
  capacity: number;
  points: Point<T>[] = [];
  divided: boolean = false;
  northeast: Quadtree<T> | null = null;
  northwest: Quadtree<T> | null = null;
  southeast: Quadtree<T> | null = null;
  southwest: Quadtree<T> | null = null;

  constructor(boundary: Rectangle, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  subdivide(): void {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w / 2;
    const h = this.boundary.h / 2;

    const ne = new Rectangle(x + w, y - h, w, h);
    this.northeast = new Quadtree<T>(ne, this.capacity);
    const nw = new Rectangle(x - w, y - h, w, h);
    this.northwest = new Quadtree<T>(nw, this.capacity);
    const se = new Rectangle(x + w, y + h, w, h);
    this.southeast = new Quadtree<T>(se, this.capacity);
    const sw = new Rectangle(x - w, y + h, w, h);
    this.southwest = new Quadtree<T>(sw, this.capacity);

    this.divided = true;
  }

  insert(point: Point<T>): boolean {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    } else {
      if (!this.divided) {
          this.subdivide();
      }
      if (this.northeast?.insert(point)) return true;
      if (this.northwest?.insert(point)) return true;
      if (this.southeast?.insert(point)) return true;
      if (this.southwest?.insert(point)) return true;
    }
    return false; // Should not happen if boundary check passes
  }

  query(range: Rectangle, found?: Point<T>[]): Point<T>[] {
    if (!found) {
      found = [];
    }

    if (!this.boundary.intersects(range)) {
      return found;
    } else {
      for (let p of this.points) {
        if (range.contains(p)) {
          found.push(p);
        }
      }
      if (this.divided) {
        this.northwest?.query(range, found);
        this.northeast?.query(range, found);
        this.southwest?.query(range, found);
        this.southeast?.query(range, found);
      }
    }
    return found;
  }
}