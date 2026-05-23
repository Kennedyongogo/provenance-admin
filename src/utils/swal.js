import Swal from "sweetalert2";
import "./../App.css";

export const showLoading = (message = "Please wait...") => {
  Swal.fire({
    customClass: {
      container: "swal-container-class",
    },
    title: message,
    allowOutsideClick: false,
    showConfirmButton: false,
    willOpen: () => {
      Swal.showLoading();
    },
  });
};

export const closeLoading = () => {
  Swal.close();
};

export const showSuccess = (message) => {
  Swal.fire({
    customClass: {
      container: "swal-container-class",
    },
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 2000,
  });
};

export const showError = (message) => {
  Swal.fire({
    customClass: {
      container: "swal-container-class",
    },
    icon: "error",
    title: "Error",
    text: message,
    confirmButtonText: "OK",
  });
};

export const showWarning = (message) => {
  Swal.fire({
    customClass: {
      container: "swal-container-class",
    },
    icon: "warning",
    title: "Warning",
    text: message,
    confirmButtonText: "OK",
  });
};

export const showConfirm = async (message) => {
  const result = await Swal.fire({
    customClass: {
      container: "swal-container-class",
    },
    icon: "question",
    title: "Confirm",
    text: message,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  });
  return result.isConfirmed;
};
