const API = "http://localhost:3001";
let employees = [];
let attendance = {};
let pending = JSON.parse(localStorage.getItem("attendanceQueue") || "[]");

$("#date").val(new Date().toISOString().split("T")[0]);

function saveQueue() {
  localStorage.setItem("attendanceQueue", JSON.stringify(pending));
  $("#pending").text(`${pending.length} records pending sync`);
}

function loadData() {
  $.when(
    $.ajax({ url: API + "/employees", method: "GET" }),
    $.ajax({ url: API + "/attendance", method: "GET" }),
  )
    .done(function (empRes, attRes) {
      employees = empRes[0];
      const records = attRes[0].filter((a) => a.date === $("#date").val());
      attendance = {};
      records.forEach((a) => (attendance[a.employeeId] = a.status));
      renderEmployees();
    })
    .fail(function () {
      $("#message").text("Could not load data. Start JSON Server.");
    });
}

function renderEmployees() {
  $("#employees").html(
    $.map(employees, (e) => {
      const status = attendance[e.id] || "";
      return `<div class="employee" data-id="${e.id}">
      <div><b>${e.name}</b><div>${e.department} - ${e.location}</div><span class="attendance-badge">${status || "Not marked"}</span></div>
      <div class="buttons">
        <button data-status="present" class="${status === "present" ? "active" : ""}">Present</button>
        <button data-status="absent" class="${status === "absent" ? "active" : ""}">Absent</button>
        <button data-status="wfh" class="${status === "wfh" ? "active" : ""}">WFH</button>
        <button data-status="leave" class="${status === "leave" ? "active" : ""}">Leave</button>
      </div>
    </div>`;
    }).join(""),
  );
  updateCounts();
}

function updateCounts() {
  ["present", "absent", "wfh", "leave"].forEach((s) =>
    $("#" + s).text(Object.values(attendance).filter((x) => x === s).length),
  );
}

function markAttendance(id, status) {
  attendance[id] = status;
  const record = {
    date: $("#date").val(),
    employeeId: id,
    status,
    timestamp: Date.now(),
  };
  pending = pending.filter(
    (x) => !(x.date === record.date && x.employeeId === id),
  );
  pending.push(record);
  saveQueue();
  renderEmployees();
}

$(document).on("click", ".buttons button", function () {
  const id = Number($(this).closest(".employee").data("id"));
  markAttendance(id, $(this).data("status"));
});

$("#date").on("change", loadData);

$("#sync").on("click", function () {
  if (!pending.length) {
    $("#message").text("Nothing to sync.");
    return;
  }
  let done = 0;
  const total = pending.length;
  $("#message").html(
    'Syncing...<div class="progress"><div class="bar"></div></div>',
  );
  const queue = [...pending];
  function next() {
    if (!queue.length) {
      $("#message").text("Sync complete.");
      loadData();
      return;
    }
    const item = queue.shift();
    $.ajax({
      url: API + "/attendance",
      method: "GET",
      data: { date: item.date, employeeId: item.employeeId },
    })
      .done(function (existing) {
        const url =
          existing.length ?
            API + "/attendance/" + existing[0].id
          : API + "/attendance";
        const method = existing.length ? "PATCH" : "POST";
        $.ajax({
          url,
          method,
          contentType: "application/json",
          data: JSON.stringify({
            ...item,
            markedBy: "supervisor_01",
            synced: true,
          }),
        })
          .done(function () {
            done++;
            pending = pending.filter(
              (x) =>
                !(x.date === item.date && x.employeeId === item.employeeId),
            );
            saveQueue();
            $(".bar").css("width", (done / total) * 100 + "%");
            next();
          })
          .fail(function (xhr) {
            if (xhr.status === 409) $("#message").text("Already marked.");
            else $("#message").text("Sync failed. Click Sync again to retry.");
          });
      })
      .fail(function () {
        $("#message").text("Could not check existing attendance.");
      });
  }
  next();
});

window.addEventListener("beforeunload", function (e) {
  if (pending.length) {
    e.preventDefault();
    e.returnValue = "";
  }
});

saveQueue();
loadData();
