import React from "react";
import { Container, Row, Col } from "react-bootstrap";

function Footer() {
  return (
    <>
      <Container>
        <Row className="justify-content-md-center">
          <Col>
            <p>
              STORE <br />
              Shop All Shipping & Returns Store Policy FAQ
            </p>
          </Col>
          <Col>
            <p>
              ADDRESS <br />
              500 Terry Francois Street San Francisco, CA 94158
            </p>
          </Col>
          <Col>
            <p>
              OPENING HOURS <br />
              Mon - Fri: 7am - 10pm Saturday: 8am - 10pm Sunday: 8am - 11pm
            </p>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Footer;
