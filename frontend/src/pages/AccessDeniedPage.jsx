import { Link } from "react-router-dom";

export default function AccessDeniedPage() {
  return (
    <main className="page">
      <section className="section section-shaped section-lg">
        <div className="shape shape-style-1 shape-primary">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card text-center">
                <div className="card-body p-5">
                  <span className="badge badge-danger badge-pill mb-3">Access Control</span>
                  <h2 className="display-4 mb-3">Role Access Required</h2>
                  <p className="text-muted mb-4">
                    This page belongs to a different role workspace. Please return to the correct dashboard for your account.
                  </p>
                  <div className="d-flex justify-content-center flex-wrap gap-2">
                    <Link className="btn btn-success m-1" to="/auth">Go To Access Page</Link>
                    <Link className="btn btn-warning m-1" to="/">Return Home</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
