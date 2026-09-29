const API = "http://localhost:3001";
let employees = [];
let selectedDepartments = [];
let searchTimer;

function loadEmployees() {
  $("#message").text("Loading employees...");
  $.ajax({ url: API + "/employees", method: "GET" })
    .done(function (data) {
      employees = data;
      buildFilters();
      render(employees);
    })
    .fail(function () {
      $("#message").text("Could not load employees. Start JSON Server.");
    });
}

function buildFilters() {
  const departments = $.map(employees, (e) => e.department).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const locations = $.map(employees, (e) => e.location).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  $("#departmentFilters").html(
    $.map(
      departments,
      (d) =>
        `<label><input type="checkbox" class="dept" value="${d}"> ${d}</label>`,
    ).join(""),
  );
  $("#location").append(
    $.map(locations, (l) => `<option value="${l}">${l}</option>`).join(""),
  );
}

function render(data) {
  const cards = $.map(
    data,
    (e) => `
    <div class="card" data-dept="${e.department}" data-id="${e.id}">
      <img loading="lazy" src="${e.avatar}" alt="${e.name}">
      <h3>${e.name}</h3>
      <p>${e.email}</p>
      <p>${e.department} | ${e.location}</p>
      <p>${e.experience} years experience</p>
      <div>${e.skills.map((s) => `<span class="skill">${s}</span>`).join("")}</div>
    </div>`,
  ).join("");

  $("#grid").fadeOut(100, function () {
    $(this)
      .html(
        cards ||
          '<div class="empty">No employees match your criteria <button id="reset">Reset</button></div>',
      )
      .fadeIn(150)
      .addClass("loaded");
  });
  $("#message").text(`${data.length} employees found`);
}

function applyFilters() {
  const search = $("#search").val().toLowerCase();
  const location = $("#location").val();
  let result = employees.filter(function (e) {
    const text = (
      e.name +
      " " +
      e.email +
      " " +
      e.skills.join(" ")
    ).toLowerCase();
    const deptOk =
      selectedDepartments.length === 0 ||
      selectedDepartments.includes(e.department);
    const locationOk = !location || e.location === location;
    return deptOk && locationOk && text.includes(search);
  });

  if (search) {
    result = $.grep(
      result,
      (e) =>
        e.experience > 3 || e.skills.join(" ").toLowerCase().includes(search),
    );
    // Keep exact name/email matches even if experience is <= 3.
    result = employees.filter(
      (e) =>
        result.includes(e) ||
        ((e.name + " " + e.email).toLowerCase().includes(search) &&
          (!location || e.location === location) &&
          (selectedDepartments.length === 0 ||
            selectedDepartments.includes(e.department))),
    );
  }

  const sort = $("#sort").val();
  result.sort(function (a, b) {
    if (sort === "experience") return b.experience - a.experience;
    if (sort === "newest")
      return new Date(b.joiningDate) - new Date(a.joiningDate);
    return a.name.localeCompare(b.name);
  });
  render(result);
}

$("#toggleFilters").on("click", function () {
  $("#departmentFilters").slideDown();
});
$("#search").on("keyup", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 300);
});
$("#location,#sort").on("change", applyFilters);
$(document).on("change", ".dept", function () {
  selectedDepartments = $(".dept:checked")
    .map(function () {
      return this.value;
    })
    .get();
  applyFilters();
});
$(document).on("click", ".card", function () {
  $(this).closest(".grid").find(".card").removeClass("highlight");
  $(this).addClass("highlight");
});
$(document).on("click", "#reset", function () {
  $("#search").val("");
  $("#location").val("");
  $(".dept").prop("checked", false);
  selectedDepartments = [];
  applyFilters();
});

loadEmployees();
