(() => {
    function formatBrPhone(value) {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        const len = digits.length;
        if (len === 0) return "";
        if (len <= 2) return `(${digits}`;
        const ddd = digits.slice(0, 2);
        const rest = digits.slice(2);
        if (len <= 6) return `(${ddd}) ${rest}`;
        if (len <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
        return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`;
    }

    function formatCpf(value) {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        const len = digits.length;
        if (len <= 3) return digits;
        if (len <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (len <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    function bindMask(input, formatter) {
        if (!input) return;
        if (input.value) {
            input.value = formatter(input.value);
        }
        input.addEventListener("input", () => {
            input.value = formatter(input.value);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        bindMask(document.getElementById("phone"), formatBrPhone);
        bindMask(document.getElementById("cpf"), formatCpf);
    });
})();
